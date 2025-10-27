SEGMENTER_PROMPT = """You split legal text into atomic normative clauses.
Return JSON list like: [{"text":"...","article_id":"Art 10(2)"}].
Rules:
- Keep original wording (no paraphrase).
- Split by normative force (“shall”, “must”, “is prohibited”, “may”).
- Keep scoping/conditions attached to the clause they constrain."""

CLASSIFIER_PROMPT = """Extract deontic structure from legal text as JSON:
{
  "modality": "OBLIGATION|PROHIBITION|PERMISSION|EXEMPTION|RECOMMENDATION",
  "actor": "...",
  "action_verb": "...",
  "object": "...",
  "condition": null or "...",
  "exceptions": [],
  "scope": {},
  "confidence": 0.0-1.0
}

Modality mapping:
- OBLIGATION: "shall", "must", "is required to", "have to"
- PROHIBITION: "shall not", "must not", "prohibited", "forbidden"
- PERMISSION: "may", "is permitted to", "is allowed to"
- EXEMPTION: "exempt from", "does not apply to", "exception"
- RECOMMENDATION: "should", "encouraged to", "advisable"

Extract actor as appears in text (e.g., "providers", "deployers").
If uncertain, set confidence < 0.7 and add "ambiguity" array.
"""

FORMALIZER_PROMPT = """Given clause JSON with modality field, produce Standard Deontic Logic formula:
{
  "json_updated": {optional patches to fields},
  "formula": "SDL formula matching the modality",
  "confidence": 0.0-1.0
}

CRITICAL: Use the "modality" field from input to determine operator:
- OBLIGATION → O(Actor -> Action [& Condition])
- PROHIBITION → F(Actor -> Action [& Condition])
- PERMISSION → P(Actor -> Action [& Condition])
- EXEMPTION → ¬O(Actor -> Action) or P(¬Action)
- RECOMMENDATION → R(Actor -> Action [& Condition])

Examples:
- Input: {"modality":"OBLIGATION","actor":"provider","action_verb":"test","object":"high-risk systems","condition":"before placing on market"}
  Output: O(provider -> test[high-risk systems] & before placing on market)

- Input: {"modality":"PROHIBITION","actor":"deployer","action_verb":"use","object":"biometric systems","condition":"for real-time identification"}
  Output: F(deployer -> use[biometric systems] & for real-time identification)

- Input: {"modality":"PERMISSION","actor":"provider","action_verb":"use","object":"synthetic data"}
  Output: P(provider -> use[synthetic data])

Keep Actor/Object tokens concise; use -> for implication, & for conjunction.
"""

VALIDATOR_PROMPT = """Validate completeness & consistency of clause JSON & formula.
Return:
{"pass": bool, "retriable": bool, "errors":[{"code":"...","msg":"..."}], "confidence": 0..1}
Fail if any required fields missing or formula malformed."""

DEFINITIONS_PROMPT = """Given clause and retrieved definitions/context, normalize canonical actors using EU AI Act terminology.
Return:
{
  "actor_canonical": "AI_Act.Provider" | "AI_Act.Deployer" | "AI_Act.Distributor" | "AI_Act.Importer" | "AI_Act.AuthorizedRepresentative" | "AI_Act.NotifiedBody" | "AI_Act.MarketSurveillanceAuthority" | "AI_Act.AI_Office" | "AI_Act.ProductManufacturer" | "AI_Act.User" | null,
  "definition_hits": [{"term":"provider","article":"Art 3(2)"}],
  "notes": "..."
}

Actor definitions from EU AI Act:
- Provider (Art 3): develops AI system or has it developed, places on market or puts into service under own name/trademark
- Deployer (Art 3): uses AI system under their authority, except personal non-professional use
- Distributor (Art 3): makes AI system available on market without affecting properties
- Importer (Art 3): places AI system from third country on EU market
- AuthorizedRepresentative (Art 3): natural/legal person in EU mandated by non-EU provider
- NotifiedBody (Art 3): conformity assessment body designated by Member State
- MarketSurveillanceAuthority (Art 3): national authorities monitoring market compliance
- AI_Office (Art 3): Commission service responsible for EU-level oversight
- ProductManufacturer: manufacturer placing product with embedded AI on market
- User: end-user or operator (when distinct from deployer)

Match raw actor string to canonical form. If text says "providers", return "AI_Act.Provider".
If text says "deployers" or "users of AI systems", return "AI_Act.Deployer".
If uncertain, return null and note in "notes" field.
"""

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

