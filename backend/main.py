from fastapi import FastAPI, Request, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from graph.state import BotState
from graph.app import run_once
from db.mongo import clauses  # same import as your own codebase
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def status_check():
    # Simulated checks, replace with actual logic if needed
    status = {
        "mongo": True,
        "pinecone": True,
        "openai": True
    }
    return status

@app.get("/api/status")
def api_status():
    return status_check()

@app.post("/api/chat")
async def api_chat(req: Request):
    payload = await req.json()
    question = payload.get('question')
    thread_id = payload.get('thread_id', 'default')
    state = {
        'thread_id': thread_id,
        'messages': [],
        'query': question,
        'contexts': [],
        'working_clause': None,
        'retries': {},
        'answer': None,
        'citations': []
    }
    state = run_once(state)
    # Return full clause for UI evidence, plus pipeline state
    clause = state.get("working_clause").model_dump() if state.get("working_clause") else {}
    return {
        "answer": state["answer"],
        "citations": state.get("citations", []),
        "route": state.get("_route", "OK"),
        "clause": clause,
        "contexts": state.get("contexts", []),
        "ambiguity_reason": state.get("_ambiguity_reason", ""),
        "thread_id": thread_id
    }

@app.get("/api/clauses")
def api_clauses(
    modality: str = Query(None),
    article: str = Query(None),
    actor: str = Query(None),
    limit: int = Query(30),
    search: str = Query(None)
):
    q = {}
    if modality: q["modality"] = modality
    if article: q["article_id"] = article
    if actor: q["actor"] = actor
    if search: q["$text"] = {"$search": search}
    results = list(clauses.find(q).sort("updated",-1).limit(limit))
    for r in results:
        r["id"] = str(r.get("_id"))
        r.pop("_id",None)
    return results

@app.put("/api/clause/{id}")
async def update_clause(id: str, payload: dict = Body(...)):
    clauses.update_one({"_id": id}, {"$set": payload})
    return {"ok": True}

@app.get("/api/clause/{id}")
def get_clause(id: str):
    r = clauses.find_one({"_id": id})
    if r:
        r["id"] = str(r["_id"])
        r.pop("_id",None)
        return r
    return {}

@app.get("/api/clauses/export")
def export_clauses(modality: str = Query(None), article: str = Query(None)):
    q = {}
    if modality: q["modality"] = modality
    if article: q["article_id"] = article
    results = list(clauses.find(q).limit(500))
    for r in results: r.pop("_id", None)
    return {"data": results}
