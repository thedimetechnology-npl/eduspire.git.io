from sqlalchemy.orm import Session

from app.models.system import AuditLog


def log_action(db: Session, user_id: int, action: str, entity_type: str = None, entity_id: int = None) -> None:
    """
    Records an audit trail entry. Call this at mutation points (create/update/
    delete/status-change) across routers — it's a single flush, not a commit,
    so it participates in whatever transaction the caller is already in.
    """
    db.add(AuditLog(user_id=user_id, action=action, entity_type=entity_type, entity_id=entity_id))
    db.flush()
