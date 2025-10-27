import os
from dotenv import load_dotenv

REQUIRED_VARS = [
    "OPENAI_API_KEY",
    "MONGODB_URI",
    "MONGODB_DB",
    "MONGODB_COLL_DOCS",
    "MONGODB_COLL_CLAUSES",
    "MONGODB_COLL_CHATS",
    "EMBEDDINGS_MODEL",
    "CHAT_MODEL",
]

def load_and_validate_env():
    load_dotenv()
    missing = [k for k in REQUIRED_VARS if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    # Soft warning if tracing enabled without key
    if os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true" and not os.getenv("LANGSMITH_API_KEY"):
        print("[warn] LANGCHAIN_TRACING_V2=true but LANGSMITH_API_KEY not set.")
