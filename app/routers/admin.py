from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.system import AuditLog, SystemSetting
from app.models.user import User
from app.schemas.common import paginate, page_meta
from app.schemas.system import AuditLogOut, SettingsPublic, SettingsUpdate
from app.services.file_service import storage_usage_mb

router = APIRouter()

DEFAULTS = {
    "site_name": "EduSphere Pro",
    "support_email": "support@edusphere.pro",
    "theme_color": "#C9974A",
    "allow_registrations": "true",
    "email_notifications_enabled": "true",
}


@router.get("/admin/audit-logs")
def list_audit_logs(
    action: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    query = query.order_by(AuditLog.created_at.desc())

    logs, total = paginate(query, page, page_size)
    out = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        out.append(AuditLogOut(
            id=log.id, user_id=log.user_id, user_name=user.full_name if user else "System",
            action=log.action, entity_type=log.entity_type, entity_id=log.entity_id,
            ip_address=log.ip_address, created_at=log.created_at,
        ))
    return {"items": out, **page_meta(total, page, page_size)}


@router.get("/admin/storage", )
def storage_stats(admin: User = Depends(require_role("admin"))):
    return {"used_mb": storage_usage_mb()}


@router.get("/settings", response_model=SettingsPublic)
def get_settings(db: Session = Depends(get_db)):
    values = {s.key: s.value for s in db.query(SystemSetting).all()}
    merged = {**DEFAULTS, **values}
    return SettingsPublic(
        site_name=merged["site_name"],
        support_email=merged["support_email"],
        theme_color=merged["theme_color"],
        allow_registrations=merged["allow_registrations"] == "true",
    )


@router.put("/admin/settings", response_model=SettingsPublic)
def update_settings(payload: SettingsUpdate, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        str_value = "true" if value is True else "false" if value is False else str(value)
        if setting:
            setting.value = str_value
        else:
            db.add(SystemSetting(key=key, value=str_value))
    db.commit()
    return get_settings(db)
