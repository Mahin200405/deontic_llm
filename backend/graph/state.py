from typing import List, Dict, Optional, Literal, TypedDict, Any
from pydantic import BaseModel, Field
import uuid, time

Modality = Literal["OBLIGATION","PROHIBITION","PERMISSION","EXEMPTION","RECOMMENDATION"]

class Clause(BaseModel):
    clause_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    article_id: Optional[str] = None
    text: str
    modality: Optional[Modality] = None
    actor: Optional[str] = None
    actor_canonical: Optional[str] = None
    action_verb: Optional[str] = None
    object: Optional[str] = None
    condition: Optional[str] = None
    exceptions: List[str] = []
    scope: Optional[Dict[str, Any]] = None
    timeline: Optional[Dict[str, Optional[str]]] = None
    formulas: Dict[str, str] = Field(default_factory=dict)
    confidence: Dict[str, float] = Field(default_factory=dict)
    ambiguity: List[Dict[str, Any]] = Field(default_factory=list)
    provenance: Dict[str, Any] = Field(default_factory=dict)

class BotState(TypedDict):
    thread_id: str
    messages: List[Dict[str, Any]]
    query: Optional[str]
    contexts: List[Dict[str, Any]]     # retrieved chunks from Mongo
    working_clause: Optional[Clause]
    retries: Dict[str, int]
    answer: Optional[str]
    citations: List[str]
