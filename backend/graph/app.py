from graph.state import BotState
from graph.nodes import (
    rag_retriever, provision_segmenter, clause_classifier,
    definitions_node, xref_node,
    deontic_formalizer, validator, ambiguity_router,
    answer_composer, persist_results
)

MAX_REFINES = 2

def run_once(state: BotState):
    # 1) Retrieve top-k chunks (vector search; no in-memory store)
    state = rag_retriever(state)

    # 2) Segment current context into a clause, then classify it
    state = provision_segmenter(state)
    state = clause_classifier(state)

    # 3) Enrich with definitions and xrefs
    state = definitions_node(state)
    state = xref_node(state)

    # 4) Formalize + Validate; bounded refine loop
    refines = 0
    while True:
        state = deontic_formalizer(state)
        state = validator(state)
        if state.get("_route") == "REFINE" and refines < MAX_REFINES:
            refines += 1
            continue
        break

    # 5) Ambiguity handling (may request a final refine or human review)
    state = ambiguity_router(state)
    if state.get("_route") == "REFINE" and refines < MAX_REFINES:
        state = deontic_formalizer(state)
        state = validator(state)

    # 6) Compose grounded answer and persist artifacts
    state = answer_composer(state)
    state = persist_results(state)
    return state
