import uuid
from bootstrap.env import load_and_validate_env
from graph.state import BotState
from graph.app import run_once

def new_thread_id() -> str:
    return str(uuid.uuid4())

if __name__ == "__main__":
    load_and_validate_env()
    tid = new_thread_id()
    print("Thread:", tid)
    print("Type 'exit' to quit.")
    while True:
        q = input("\nYou: ").strip()
        if not q:
            continue
        if q.lower() in {"exit", "quit"}:
            break
        state: BotState = {
            "thread_id": tid,
            "messages": [],
            "query": q,
            "contexts": [],
            "working_clause": None,
            "retries": {},
            "answer": None,
            "citations": []
        }
        state = run_once(state)
        print("\nAssistant:", state.get("answer","(no answer)"))
        if state.get("citations"):
            print("Citations:", ", ".join(state["citations"]))
