from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.academic import Course, CourseStatus
from app.models.user import RoleEnum, User

router = APIRouter()


@router.get("")
def global_search(
    q: str = Query(min_length=1),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    courses = (
        db.query(Course)
        .filter(Course.status == CourseStatus.published, Course.title.ilike(f"%{q}%"))
        .limit(6).all()
    )
    teachers = (
        db.query(User)
        .filter(User.role == RoleEnum.teacher, User.full_name.ilike(f"%{q}%"))
        .limit(6).all()
    )

    result = {
        "courses": [{"id": c.id, "title": c.title, "type": "course"} for c in courses],
        "teachers": [{"id": t.id, "title": t.full_name, "type": "teacher"} for t in teachers],
    }

    if user and user.role in (RoleEnum.teacher, RoleEnum.admin):
        students = (
            db.query(User)
            .filter(User.role == RoleEnum.student, User.full_name.ilike(f"%{q}%"))
            .limit(6).all()
        )
        result["students"] = [{"id": s.id, "title": s.full_name, "type": "student"} for s in students]

    return result
