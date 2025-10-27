import os
from pymongo import MongoClient
from bootstrap.env import load_and_validate_env

# ensure .env is loaded & validated once
load_and_validate_env()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLL_DOCS = os.getenv("MONGODB_COLL_DOCS", "docs")
COLL_CLAUSES = os.getenv("MONGODB_COLL_CLAUSES", "clauses")
COLL_CHATS = os.getenv("MONGODB_COLL_CHATS", "chats")

_client = MongoClient(MONGODB_URI)
db = _client[DB_NAME]
docs = db[COLL_DOCS]
clauses = db[COLL_CLAUSES]
chats = db[COLL_CHATS]
