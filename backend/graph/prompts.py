SEGMENTER_PROMPT = """You split legal text into atomic normative clauses.
Return JSON list like: [{"text":"...","article_id":"Art 10(2)"}].
Rules:
- Keep original wording (no paraphrase).
- Split by normative force (“shall”, “must”, “is prohibited”, “may”).
- Keep scoping/conditions attached to the clause they constrain."""

CLASSIFIER_PROMPT = """Extract as JSON:
{
  "modality": "OBLIGATION|PROHIBITION|PERMISSION|EXEMPTION|RECOMMENDATION",
  "actor": "...", "action_verb": "...", "object": "...",
  "condition": null or "...", "exceptions": [], "scope": {}
}
Include a "confidence" field (0..1). If uncertain, leave fields null and prefer "ambiguity": [{"type":"...","severity":"low|medium|high","notes":"..."}].
"""

FORMALIZER_PROMPT = """Given clause JSON, produce:
{
  "json_updated": {optional, patch of fields},
  "formula": "SDL formula like O(Actor -> Action [& Condition]) or F(Actor -> Action) or P(Action)",
  "confidence": 0..1
}
Keep Actor/Object tokens concise; adhere to Standard Deontic Logic notation (O,F,P)."""

VALIDATOR_PROMPT = """Validate completeness & consistency of clause JSON & formula.
Return:
{"pass": bool, "retriable": bool, "errors":[{"code":"...","msg":"..."}], "confidence": 0..1}
Fail if any required fields missing or formula malformed."""

DEFINITIONS_PROMPT = """Given clause and retrieved definitions/context, normalize canonical actors.
Return:
{
  "actor_canonical": "AI_Act.Provider" | null,
  "definition_hits": [{"term":"provider","article":"Art 3(2)"}],
  "notes": "..."
}"""

XREF_PROMPT = """Identify cross-references in clause text, such as 'subject to Article 6(2)' or 'as set out in Annex III'.
Return:
{
  "xref_links": [{"target":"Art 6(2)","type":"subject_to"}],
  "imported_conditions": ["..."],
  "notes": "..."
}"""

AMBIGUITY_PROMPT = """Given clause JSON and validator errors, choose route:
{"route":"REFINE"|"REVIEW"|"ACCEPT_LOW_CONF","reason":"..."}
Use REVIEW if semantic gaps/definitions missing; REFINE if fixable formatting/structure; ACCEPT if minor and confidence>=0.7.
"""

ANSWER_PROMPT = """Return ONLY JSON:
{"answer": "<concise grounded summary with bullets and article ids>"}
Use ONLY the provided clause/contexts; no extra sources."""

