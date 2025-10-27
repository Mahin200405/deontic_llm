import json
from typing import Dict, Any, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from langchain_openai import OpenAIEmbeddings
from utils.openai_client import get_chat, get_embeddings
from db.mongo import docs, clauses, chats
from graph.state import BotState, Clause
from graph import prompts as P
from pinecone import Pinecone
import os

# ---------- Helpers ----------

def _llm_json(prompt: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    chat = get_chat()
    msg = f"{prompt}\n\nReturn ONLY a single JSON object.\n\nINPUT:\n{json.dumps(payload, ensure_ascii=False)}"
    resp = chat.invoke([("user", msg)])
    txt = resp.content or ""
    try:
        return json.loads(txt)
    except Exception:
        # Fallback: return raw text as an "answer" so UI never goes blank
        return {"answer": txt.strip(), "_raw": True}


def _embed_query(q: str) -> List[float]:
    emb = get_embeddings()
    return emb.embed_query(q)

def _persist_chat(thread_id: str, role: str, content: str, retrieval_log: Optional[Dict[str, Any]] = None):
    chats.insert_one({
        "thread_id": thread_id,
        "role": role,
        "content": content,
        "retrieval_log": retrieval_log or {},
    })

# ---------- Retrieval ----------

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def rag_retriever(state: BotState) -> BotState:
    emb = get_embeddings()
    qvec = emb.embed_query(state["query"] or "")
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    idx = pc.Index(os.getenv("PINECONE_INDEX"))
    res = idx.query(vector=qvec, top_k=6, include_metadata=True)
    state["contexts"] = [
        {
            "text": m["metadata"].get("text",""),
            "article_id": m["metadata"].get("article_id"),
            "source_uri": m["metadata"].get("source_uri"),
            "source_version": m["metadata"].get("source_version"),
            "score": m.get("score")
        }
        for m in res.get("matches", [])
    ]
    return state

# ---------- Pipeline nodes ----------

def provision_segmenter(state: BotState) -> BotState:
    # concatenate a couple of best contexts to avoid exploding tokens
    ctx = "\n\n".join([h["text"] for h in state["contexts"][:2]])
    r = _llm_json(P.SEGMENTER_PROMPT, {"text": ctx})
    items = r if isinstance(r, list) else r.get("clauses", [])
    if not items:
        # fall back to a single "clause" being the top chunk itself
        text = state["contexts"][0]["text"] if state["contexts"] else ""
        state["working_clause"] = Clause(text=text, article_id=(state["contexts"][0].get("article_id") if state["contexts"] else None))
        return state
    first = items[0]
    state["working_clause"] = Clause(text=first["text"], article_id=first.get("article_id"))
    return state

# def clause_classifier(state: BotState) -> BotState:
#     c = state["working_clause"]
#     r = _llm_json(P.CLASSIFIER_PROMPT, {"text": c.text})
#     for k, v in r.items():
#         if hasattr(c, k):
#             setattr(c, k, v)
#     c.confidence["classify"] = r.get("confidence", 0.8)
#     return state

def clause_classifier(state: BotState) -> BotState:
    c = state["working_clause"]
    r = _llm_json(P.CLASSIFIER_PROMPT, {"text": c.text})

    # only set known structural fields
    for k in ["modality","actor","action_verb","object","condition","exceptions","scope","ambiguity"]:
        if k in r:
            setattr(c, k, r[k])

    # keep confidence a dict
    if not isinstance(c.confidence, dict):
        c.confidence = {}
    if "confidence" in r:
        try:
            c.confidence["classify"] = float(r["confidence"])
        except Exception:
            pass

    return state


def definitions_node(state: BotState) -> BotState:
    c = state["working_clause"]
    defs_ctx = "\n\n".join([d["text"] for d in state["contexts"][:3]])
    r = _llm_json(P.DEFINITIONS_PROMPT, {"clause": c.model_dump(), "definitions_context": defs_ctx})
    if r.get("actor_canonical"):
        c.actor_canonical = r["actor_canonical"]
    prov = c.provenance or {}
    prov["definition_hits"] = r.get("definition_hits", [])
    c.provenance = prov
    return state

def xref_node(state: BotState) -> BotState:
    c = state["working_clause"]
    r = _llm_json(P.XREF_PROMPT, {"clause": c.model_dump()})
    prov = c.provenance or {}
    prov["xref_links"] = r.get("xref_links", [])
    c.provenance = prov
    imported = r.get("imported_conditions", [])
    if imported:
        c.condition = (c.condition + " AND " if c.condition else "") + " AND ".join(imported)
    return state

# def deontic_formalizer(state: BotState) -> BotState:
#     c = state["working_clause"]
#     r = _llm_json(P.FORMALIZER_PROMPT, {"json": c.model_dump()})
#     c.formulas["deontic"] = r.get("formula")
#     c.confidence["formalize"] = r.get("confidence", 0.8)
#     if "json_updated" in r:
#         for k, v in r["json_updated"].items():
#             if hasattr(c, k):
#                 setattr(c, k, v)
#     return state

def deontic_formalizer(state: BotState) -> BotState:
    c = state["working_clause"]
    r = _llm_json(P.FORMALIZER_PROMPT, {"json": c.model_dump()})
    c.formulas["deontic"] = r.get("formula")

    if not isinstance(c.confidence, dict):
        c.confidence = {}
    if "confidence" in r:
        try:
            c.confidence["formalize"] = float(r["confidence"])
        except Exception:
            pass

    # apply json_updated but never clobber confidence dict
    ju = r.get("json_updated") or {}
    for k, v in ju.items():
        if k == "confidence":
            continue
        if hasattr(c, k):
            setattr(c, k, v)
    return state


# def validator(state: BotState) -> BotState:
#     from utils.validation import cheap_checks
#     c = state["working_clause"]
#     local = cheap_checks(c)
#     remote = _llm_json(P.VALIDATOR_PROMPT, c.model_dump())
#     errors = (local.get("errors", []) or []) + (remote.get("errors", []) or [])
#     passed = bool(local["pass"] and remote.get("pass", False))
#     state["_errors"] = errors
#     state["retries"].setdefault("formalizer", 0)
#     if not passed and remote.get("retriable", True) and state["retries"]["formalizer"] < 2:
#         state["retries"]["formalizer"] += 1
#         state["_route"] = "REFINE"
#     elif not passed:
#         state["_route"] = "REVIEW"
#     else:
#         state["_route"] = "OK"
#     return state

def validator(state: BotState) -> BotState:
    """
    Validates the current clause with local rules + LLM.
    - Sets state["_errors"] (merged list)
    - Sets state["_route"] in {"OK","REFINE","REVIEW"}
    - Increments bounded retries for formalizer
    - Records a numeric confidence under c.confidence["validate"]
    """
    from utils.validation import cheap_checks

    c = state["working_clause"]
    # --- Local checks
    local = cheap_checks(c)  # {"pass": bool, "errors": [...]}

    # --- LLM checks (force JSON; tolerate plain text)
    remote = _llm_json(P.VALIDATOR_PROMPT, c.model_dump())
    # Normalize remote fields
    remote_pass = bool(remote.get("pass", False))
    remote_retriable = bool(remote.get("retriable", True))
    remote_errors = remote.get("errors", [])
    if not isinstance(remote_errors, list):
        remote_errors = [{"code": "validator_nonlist_errors", "msg": str(remote_errors)}]

    # --- Merge errors & pass
    errors = (local.get("errors") or []) + remote_errors
    passed = bool(local.get("pass", False) and remote_pass)
    state["_errors"] = errors

    # --- Confidence merge (always keep dict)
    if not isinstance(c.confidence, dict):
        c.confidence = {}
    try:
        if "confidence" in remote:
            c.confidence["validate"] = float(remote["confidence"])
    except Exception:
        # best-effort parse of odd types
        try:
            c.confidence["validate"] = float(str(remote["confidence"]).strip())
        except Exception:
            pass

    # --- Routing & retries
    # Bound retries for the formalizer refinement loop
    state["retries"].setdefault("formalizer", 0)
    MAX_REFINES = 2  # keep in sync with app.py

    if passed:
        state["_route"] = "OK"
        return state

    # Not passed
    if remote_retriable and state["retries"]["formalizer"] < MAX_REFINES:
        state["retries"]["formalizer"] += 1
        state["_route"] = "REFINE"   # app.py will re-run formalizer
    else:
        state["_route"] = "REVIEW"   # send to ambiguity/human review

    return state


def ambiguity_router(state: BotState) -> BotState:
    c = state["working_clause"]
    val = {"errors": state.get("_errors", []), "confidence": c.confidence.get("formalize", 0.0)}
    r = _llm_json(P.AMBIGUITY_PROMPT, {"clause": c.model_dump(), "validator": val})
    route = r.get("route", "REVIEW")
    reason = r.get("reason", "")
    state["_route"] = route
    state["_ambiguity_reason"] = reason
    prov = c.provenance or {}
    prov["ambiguity_route"] = route
    prov["ambiguity_reason"] = reason
    c.provenance = prov
    return state

def answer_composer(state: BotState) -> BotState:
    c = state["working_clause"]
    r = _llm_json(P.ANSWER_PROMPT, {
        "question": state["query"], "clause": c.model_dump(), "contexts": state["contexts"]
    })
    if isinstance(r, dict) and r.get("answer"):
        state["answer"] = r["answer"]
    else:
        # final safeguard: synthesize a minimal answer from the clause
        bits = []
        if c.modality and (c.actor or c.actor_canonical) and (c.object or c.action_verb):
            who = c.actor_canonical or c.actor or "Actor"
            what = c.object or c.action_verb or "the required action"
            line = f"• **{c.modality}** for **{who}**: {what}"
            if c.condition: line += f" — _Condition_: {c.condition}"
            bits.append(line)
        state["answer"] = "\n".join(bits) or "I found relevant provisions (see citations), but couldn’t format a summary."
    # citations (unchanged) ...
    return state


def persist_results(state: BotState) -> BotState:
    # persist chat
    _persist_chat(
        thread_id=state["thread_id"],
        role="user",
        content=state["query"],
        retrieval_log={"doc_hits": [h.get("source_uri","") for h in state["contexts"]]}
    )
    _persist_chat(
        thread_id=state["thread_id"],
        role="assistant",
        content=state.get("answer",""),
        retrieval_log={"citations": state.get("citations", [])}
    )
    # upsert clause
    c = state["working_clause"].model_dump()
    clauses.update_one(
        {"text": c["text"], "article_id": c.get("article_id")},
        {"$set": c},
        upsert=True
    )
    return state
