import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from bootstrap.env import load_and_validate_env

load_and_validate_env()

CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "text-embedding-3-large")

def get_chat(model: str = None, temperature: float = 0.1, timeout: int = 60) -> ChatOpenAI:
    return ChatOpenAI(
        model=model or CHAT_MODEL,
        temperature=temperature,
        timeout=timeout,
        model_kwargs={"response_format": {"type": "json_object"}}  # 👈 force JSON
    )


def get_embeddings(model: str = None) -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model=model or EMBEDDINGS_MODEL)
