from fastapi import FastAPI, Request, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from graph.state import BotState
from graph.app import run_once
from db.mongo import clauses  # same import as your own codebase
import os

app = FastAPI()

# CORS middleware - must be added BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Vercel, localhost, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
    if modality and modality != "all": q["modality"] = modality
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
    if modality and modality!="all": q["modality"] = modality
    if article: q["article_id"] = article
    results = list(clauses.find(q).limit(500))
    for r in results: r.pop("_id", None)
    return {"data": results}

@app.get("/api/graph")
def api_graph(
    modality: str = Query(None),
    article: str = Query(None),
    actor: str = Query(None),
    limit: int = Query(100)
):
    """Generate dependency graph data from clauses"""
    q = {}
    if modality and modality != "all": q["modality"] = modality
    if article: q["article_id"] = article
    if actor: q["actor_canonical"] = actor

    results = list(clauses.find(q).limit(limit))

    # Build nodes and edges
    nodes = []
    edges = []
    actor_nodes = {}
    article_nodes = {}

    for idx, clause in enumerate(results):
        clause_id = str(clause.get("_id"))

        # Create clause node
        node = {
            "id": clause_id,
            "type": "clause",
            "data": {
                "label": f"{clause.get('article_id', 'Unknown')}: {clause.get('actor', 'Unknown')}",
                "modality": clause.get("modality", "UNKNOWN"),
                "actor": clause.get("actor_canonical") or clause.get("actor"),
                "object": clause.get("object", ""),
                "article_id": clause.get("article_id"),
                "condition": clause.get("condition"),
                "formula": clause.get("formulas", {}).get("deontic", ""),
                "text": clause.get("text", "")[:100] + "..." if len(clause.get("text", "")) > 100 else clause.get("text", "")
            },
            "position": {"x": 0, "y": 0}  # Will be laid out by frontend
        }
        nodes.append(node)

        # Track actors
        actor_name = clause.get("actor_canonical") or clause.get("actor")
        if actor_name and actor_name not in actor_nodes:
            actor_nodes[actor_name] = {
                "id": f"actor_{len(actor_nodes)}",
                "type": "actor",
                "data": {"label": actor_name, "type": "actor"},
                "position": {"x": 0, "y": 0}
            }

        # Track articles
        article_id = clause.get("article_id")
        if article_id and article_id not in article_nodes:
            article_nodes[article_id] = {
                "id": f"article_{article_id}",
                "type": "article",
                "data": {"label": f"Article {article_id}", "article_id": article_id},
                "position": {"x": 0, "y": 0}
            }

        # Create edges from clause to actor
        if actor_name and actor_name in actor_nodes:
            edges.append({
                "id": f"edge_{clause_id}_to_actor_{actor_name}",
                "source": clause_id,
                "target": actor_nodes[actor_name]["id"],
                "type": "actor_edge",
                "label": "binds"
            })

        # Create edges from article to clause
        if article_id and article_id in article_nodes:
            edges.append({
                "id": f"edge_article_{article_id}_to_{clause_id}",
                "source": article_nodes[article_id]["id"],
                "target": clause_id,
                "type": "article_edge",
                "label": "defines"
            })

    # Add actor and article nodes
    nodes.extend(actor_nodes.values())
    nodes.extend(article_nodes.values())

    # Detect conditional dependencies
    for i, clause1 in enumerate(results):
        clause1_id = str(clause1.get("_id"))
        condition = clause1.get("condition", "")

        if condition:
            # Check if condition mentions other actors
            for j, clause2 in enumerate(results):
                if i != j:
                    clause2_id = str(clause2.get("_id"))
                    actor2 = clause2.get("actor_canonical") or clause2.get("actor", "")
                    object2 = clause2.get("object", "")

                    # Simple string matching - mentions other clause's actor or object
                    if actor2 and actor2.lower() in condition.lower():
                        edges.append({
                            "id": f"dep_{clause1_id}_on_{clause2_id}",
                            "source": clause2_id,
                            "target": clause1_id,
                            "type": "dependency",
                            "label": "condition"
                        })
                    elif object2 and object2.lower() in condition.lower():
                        edges.append({
                            "id": f"dep_{clause1_id}_on_{clause2_id}_obj",
                            "source": clause2_id,
                            "target": clause1_id,
                            "type": "dependency",
                            "label": "requires"
                        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_clauses": len(results),
            "total_actors": len(actor_nodes),
            "total_articles": len(article_nodes),
            "total_edges": len(edges)
        }
    }
