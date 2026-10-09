from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.academic import Enrollment
from app.models.system import AuditLog
from app.models.user import RoleEnum, StudentProfile, TeacherProfile, User
from app.schemas.academic import EnrollmentOut
from app.schemas.common import paginate, page_meta
from app.schemas.user import (
    StudentProfileUpdate, TeacherProfileUpdate, UserDetailOut, UserOut, UserStatusUpdate, UserUpdate,
)

router = APIRouter()


@router.get("/me", response_model=UserDetailOut)
def get_my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _detail(user)


@router.put("/me", response_model=UserOut)
def update_my_profile(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/student-profile", response_model=UserDetailOut)
def update_student_profile(
    payload: StudentProfileUpdate,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(user)
    return _detail(user)


@router.put("/me/teacher-profile", response_model=UserDetailOut)
def update_teacher_profile(
    payload: TeacherProfileUpdate,
    user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db),
):
    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
    if not profile:
        profile = TeacherProfile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(user)
    return _detail(user)


@router.get("/students")
def list_students(
    search: Optional[str] = None,
    active_only: bool = False,
    page: Optional[int] = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(require_role("teacher", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.role == RoleEnum.student)
    if search:
        query = query.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    if active_only:
        query = query.filter(User.is_active.is_(True))
    query = query.order_by(User.full_name)

    if page is None:
        return [_detail(u) for u in query.all()]

    items, total = paginate(query, page, page_size)
    return {"items": [_detail(u) for u in items], **page_meta(total, page, page_size)}


@router.get("/teachers")
def list_teachers(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.role == RoleEnum.teacher, User.is_active.is_(True))
    if search:
        query = query.filter(User.full_name.ilike(f"%{search}%"))
    query = query.order_by(User.full_name)

    items, total = paginate(query, page, page_size)
    return {
        "items": [
            {"id": u.id, "full_name": u.full_name, "role": u.role.value, "avatar_url": u.avatar_url}
            for u in items
        ],
        **page_meta(total, page, page_size),
    }


@router.get("/students/{student_id}/enrollment-history", response_model=list[EnrollmentOut])
def student_enrollment_history(
    student_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == RoleEnum.student and user.id != student_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only view your own enrollment history")

    from app.routers.academic import _enrollment_out
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    return [_enrollment_out(db, e) for e in enrollments]


@router.get("/{user_id}", response_model=UserDetailOut)
def get_user(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == user_id or user.role == RoleEnum.admin:
        return _detail(target)
    if user.role == RoleEnum.teacher and target.role == RoleEnum.student:
        return _detail(target)
    return UserDetailOut(
        id=target.id, full_name=target.full_name, email=target.email,
        role=target.role, is_active=target.is_active, is_verified=target.is_verified,
        avatar_url=target.avatar_url, created_at=target.created_at,
    )


@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    target.is_active = payload.is_active
    db.add(AuditLog(user_id=admin.id, action="user.status_update", entity_type="user", entity_id=user_id))
    db.commit()
    db.refresh(target)
    return target


def _detail(user: User) -> UserDetailOut:
    data = UserOut.model_validate(user).model_dump()
    data["student_profile"] = user.student_profile
    data["teacher_profile"] = user.teacher_profile
    return UserDetailOut.model_validate(data)
