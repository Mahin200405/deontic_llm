from graph.state import Clause

def cheap_checks(c: Clause) -> dict:
    errs = []
    if not c.modality:
        errs.append({"code": "missing_modality", "msg": "No modality extracted."})
    if not c.actor and not c.actor_canonical:
        errs.append({"code": "missing_actor", "msg": "No actor extracted."})
    if not c.formulas.get("deontic"):
        errs.append({"code": "missing_formula", "msg": "No SDL formula present."})
    return {"pass": len(errs) == 0, "errors": errs}
