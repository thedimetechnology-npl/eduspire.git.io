from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
import os
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user, require_role
from app.core.security import create_media_token, decode_token
from app.core.config import settings
from app.core.audit import log_action
from app.models.academic import Category, Course, CourseStatus, Enrollment, Lesson, LessonProgress
from app.models.assessment import Assignment, Quiz
from app.models.engagement import Attendance, Certificate, LiveClass, Review
from app.models.user import RoleEnum, User
from app.schemas.academic import (
    CategoryCreate, CategoryOut, CourseCard, CourseCreate, CourseDetail, CourseUpdate,
    EnrollmentOut, LessonCreate, LessonOut, LessonProgressUpdate,
)
from app.schemas.common import paginate, page_meta
from app.services.certificate_service import generate_certificate_pdf
from app.services.file_service import delete_upload, save_upload
from app.services.notification_service import (
    notify_certificate_issued,
    notify_enrollment,
    notify_new_course,
    notify_teacher_new_enrollment,
    notify_new_lesson,
    notify_all_students,
)

router = APIRouter()


# ---------- Categories ----------

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    out = []
    for c in categories:
        count = db.query(Course).filter(Course.category_id == c.id, Course.status == CourseStatus.published).count()
        out.append(CategoryOut(id=c.id, name=c.name, description=c.description, course_count=count))
    return out


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.name == payload.name).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Category already exists")
    category = Category(**payload.model_dump())
    db.add(category)
    db.flush()
    log_action(db, admin.id, "category.create", "category", category.id)
    db.commit()
    db.refresh(category)
    return CategoryOut(id=category.id, name=category.name, description=category.description, course_count=0)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryCreate, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    category.name = payload.name
    category.description = payload.description
    db.commit()
    count = db.query(Course).filter(Course.category_id == category.id).count()
    return CategoryOut(id=category.id, name=category.name, description=category.description, course_count=count)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category:
        log_action(db, admin.id, "category.delete", "category", category.id)
        db.delete(category)
        db.commit()


# ---------- Courses ----------

def _course_card(db: Session, course: Course) -> CourseCard:
    ratings = db.query(Review.rating).filter(Review.course_id == course.id).all()
    rating_avg = round(sum(r[0] for r in ratings) / len(ratings), 1) if ratings else 0
    enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    lesson_count = db.query(Lesson).filter(Lesson.course_id == course.id).count()
    return CourseCard(
        id=course.id, title=course.title, description=course.description,
        thumbnail_url=course.thumbnail_url, price=float(course.price), level=course.level,
        status=course.status, category_id=course.category_id,
        category_name=course.category.name if course.category else None,
        teacher_id=course.teacher_id, teacher_name=course.teacher.full_name if course.teacher else None,
        rating_avg=rating_avg, rating_count=len(ratings), enrolled_count=enrolled_count,
        lesson_count=lesson_count, created_at=course.created_at,
    )


@router.get("/courses")
def list_courses(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    level: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    teacher_id: Optional[int] = None,
    mine: bool = False,
    page: Optional[int] = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(Course)

    if mine and user:
        if user.role == RoleEnum.teacher:
            query = query.filter(Course.teacher_id == user.id)
        elif user.role == RoleEnum.student:
            query = query.join(Enrollment, Enrollment.course_id == Course.id).filter(Enrollment.student_id == user.id)
    else:
        if user and user.role == RoleEnum.admin:
            if status_filter:
                query = query.filter(Course.status == status_filter)
        else:
            query = query.filter(Course.status == CourseStatus.published)

    if search:
        query = query.filter(Course.title.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Course.category_id == category_id)
    if level:
        query = query.filter(Course.level == level)
    if teacher_id:
        query = query.filter(Course.teacher_id == teacher_id)

    query = query.order_by(Course.created_at.desc())

    if page is None:
        return [_course_card(db, c) for c in query.all()]

    items, total = paginate(query, page, page_size)
    return {
        "items": [_course_card(db, c) for c in items],
        **page_meta(total, page, page_size),
    }


@router.get("/courses/{course_id}", response_model=CourseDetail)
def get_course(course_id: int, user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.status != CourseStatus.published and not (
        user and (
            user.role == RoleEnum.admin
            or user.role == RoleEnum.teacher and user.id == course.teacher_id
        )
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")

    card = _course_card(db, course)
    is_enrolled, progress = False, 0.0
    enrollment = None
    if user and user.role == RoleEnum.student:
        enrollment = db.query(Enrollment).filter(Enrollment.course_id == course_id, Enrollment.student_id == user.id).first()
        if enrollment:
            is_enrolled = True
            progress = enrollment.progress_percent

    can_access_lessons = bool(
        user and (
            user.role == RoleEnum.admin
            or user.role == RoleEnum.teacher and user.id == course.teacher_id
            or is_enrolled
        )
    )

    lessons = []
    completed_ids = set()
    if user and user.role == RoleEnum.student:
        completed_ids = {
            lp.lesson_id for lp in db.query(LessonProgress).filter(
                LessonProgress.student_id == user.id, LessonProgress.is_completed.is_(True)
            )
        }
    for lesson in course.lessons:
        lesson_progress = None
        if user and user.role == RoleEnum.student:
            lesson_progress = db.query(LessonProgress).filter(
                LessonProgress.student_id == user.id,
                LessonProgress.lesson_id == lesson.id,
            ).first()
        lessons.append(LessonOut(
            id=lesson.id, course_id=lesson.course_id, title=lesson.title, lesson_type=lesson.lesson_type,
            duration_minutes=lesson.duration_minutes,
            order_index=lesson.order_index,
            content_url=(
                f"/api/lessons/{lesson.id}/media"
                if user and user.role == RoleEnum.student and can_access_lessons and lesson.content_url and (
                    lesson.content_url.startswith("/uploads/lessons/")
                    or lesson.content_url.startswith("/private-lessons/")
                )
                else lesson.content_url if can_access_lessons else None
            ),
            is_completed=lesson.id in completed_ids,
            position_seconds=lesson_progress.position_seconds if lesson_progress else 0,
        ))

    return CourseDetail(**card.model_dump(), lessons=lessons, is_enrolled=is_enrolled, my_progress=progress)


@router.post("/courses", response_model=CourseCard, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = Course(**payload.model_dump(), teacher_id=teacher.id, status=CourseStatus.draft)
    db.add(course)
    db.flush()
    log_action(db, teacher.id, "course.create", "course", course.id)
    db.commit()
    db.refresh(course)
    return _course_card(db, course)


@router.put("/courses/{course_id}", response_model=CourseCard)
def update_course(course_id: int, payload: CourseUpdate, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _owned_course(db, course_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return _course_card(db, course)


@router.patch("/courses/{course_id}/publish", response_model=CourseCard)
def publish_course(course_id: int, publish: bool = True, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _owned_course(db, course_id, user)
    if publish and not course.lessons:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Add at least one lesson before publishing")

    was_published = course.status == CourseStatus.published
    course.status = CourseStatus.published if publish else CourseStatus.draft

    log_action(db, user.id, "course.publish" if publish else "course.unpublish", "course", course.id)

    # ============ NOTIFY ALL STUDENTS WHEN PUBLISHED ============
    # Only fires on the draft → published transition (not on unpublish or re-publish)
    if publish and not was_published:
        teacher_name = user.full_name if user else "A teacher"
        students = db.query(User).filter(User.role == RoleEnum.student).all()
        for student in students:
            notify_new_course(db, student.id, course.title, teacher_name)

    db.commit()
    db.refresh(course)
    return _course_card(db, course)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _owned_course(db, course_id, user)
    log_action(db, user.id, "course.delete", "course", course.id)

    lesson_ids = [row[0] for row in db.query(Lesson.id).filter(Lesson.course_id == course_id).all()]

    if lesson_ids:
        db.query(LessonProgress).filter(LessonProgress.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)

    db.query(Assignment).filter(Assignment.course_id == course_id).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.course_id == course_id).delete(synchronize_session=False)
    db.query(LiveClass).filter(LiveClass.course_id == course_id).delete(synchronize_session=False)
    db.query(Attendance).filter(Attendance.course_id == course_id).delete(synchronize_session=False)
    db.query(Certificate).filter(Certificate.course_id == course_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.course_id == course_id).delete(synchronize_session=False)

    db.flush()
    db.delete(course)
    db.commit()


def _owned_course(db: Session, course_id: int, user: User) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    if user.role == RoleEnum.teacher and course.teacher_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only manage your own courses")
    return course


# ---------- Lessons ----------

@router.post("/courses/{course_id}/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def add_lesson(course_id: int, payload: LessonCreate, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _owned_course(db, course_id, user)
    lesson = Lesson(course_id=course.id, **payload.model_dump())
    db.add(lesson)
    db.flush()

    # ============ NOTIFY ENROLLED STUDENTS ABOUT NEW LESSON ============
    # Only notify if the course is already published (drafts shouldn't spam students)
    if course.status == CourseStatus.published:
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course.id,
            Enrollment.status == "active",
        ).all()
        for e in enrollments:
            notify_new_lesson(db, e.student_id, course.title, lesson.title)

    db.commit()
    db.refresh(lesson)
    return LessonOut(**{**payload.model_dump(), "id": lesson.id, "course_id": course.id, "is_completed": False, "position_seconds": 0})


@router.post("/lessons/upload")
def upload_lesson_file(file: UploadFile = File(...), user: User = Depends(require_role("teacher", "admin"))):
    url = save_upload(file, "lessons")
    return {"url": url}


@router.get("/lessons/{lesson_id}/media")
def stream_lesson_media(
    lesson_id: int,
    token: Optional[str] = Query(default=None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if token:
        try:
            media_claims = decode_token(token)
            if media_claims.get("type") != "media" or int(media_claims.get("lesson_id")) != lesson_id:
                raise ValueError
            user = db.query(User).filter(User.id == int(media_claims["sub"]), User.is_active.is_(True), User.is_verified.is_(True)).first()
        except Exception:
            user = None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or not lesson.content_url or not (
        lesson.content_url.startswith("/uploads/")
        or lesson.content_url.startswith("/private-lessons/")
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson media not found")

    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    enrolled = db.query(Enrollment).filter(
        Enrollment.student_id == user.id,
        Enrollment.course_id == lesson.course_id,
        Enrollment.status.in_(["active", "completed"]),
    ).first()
    allowed = user.role.value == "admin" or (
        course and user.role.value == "teacher" and course.teacher_id == user.id
    ) or enrolled
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have access to this lesson")

    if lesson.content_url.startswith("/private-lessons/"):
        upload_root = os.path.abspath(settings.PRIVATE_UPLOAD_DIR)
        relative_path = os.path.join("lessons", lesson.content_url.removeprefix("/private-lessons/"))
    else:
        upload_root = os.path.abspath(settings.UPLOAD_DIR)
        relative_path = lesson.content_url.removeprefix("/uploads/")
    media_path = os.path.abspath(os.path.join(upload_root, relative_path))
    if not media_path.startswith(f"{upload_root}{os.sep}") or not os.path.isfile(media_path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson media not found")
    return FileResponse(media_path)


@router.get("/lessons/{lesson_id}/media-url")
def lesson_media_url(lesson_id: int, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or not lesson.content_url:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson media not found")
    enrolled = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == lesson.course_id,
        Enrollment.status.in_(["active", "completed"]),
    ).first()
    if not enrolled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this course")
    return {"url": f"/api/lessons/{lesson_id}/media?token={create_media_token(student.id, lesson_id)}"}


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
def update_lesson(lesson_id: int, payload: LessonCreate, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    _owned_course(db, lesson.course_id, user)
    previous_url = lesson.content_url
    for field, value in payload.model_dump().items():
        setattr(lesson, field, value)
    db.commit()
    db.refresh(lesson)
    if previous_url != lesson.content_url:
        delete_upload(previous_url)
    return LessonOut(id=lesson.id, course_id=lesson.course_id, title=lesson.title, lesson_type=lesson.lesson_type,
                      content_url=lesson.content_url, duration_minutes=lesson.duration_minutes,
                      order_index=lesson.order_index, is_completed=False, position_seconds=0)


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson:
        _owned_course(db, lesson.course_id, user)
        delete_upload(lesson.content_url)
        db.query(LessonProgress).filter(LessonProgress.lesson_id == lesson_id).delete(synchronize_session=False)
        db.delete(lesson)
        db.commit()


@router.post("/lessons/{lesson_id}/progress")
def mark_lesson_progress(lesson_id: int, payload: LessonProgressUpdate, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    enrolled = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == lesson.course_id,
        Enrollment.status.in_(["active", "completed"]),
    ).first()
    if not enrolled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this course")

    progress = db.query(LessonProgress).filter(
        LessonProgress.student_id == student.id, LessonProgress.lesson_id == lesson_id
    ).first()
    if not progress:
        progress = LessonProgress(student_id=student.id, lesson_id=lesson_id)
        db.add(progress)
    progress.is_completed = payload.is_completed
    progress.position_seconds = payload.position_seconds
    db.flush()

    _recalculate_progress(db, student.id, lesson.course_id)
    db.commit()
    return {"message": "Progress updated"}


def _recalculate_progress(db: Session, student_id: int, course_id: int):
    total = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    if total == 0:
        return
    completed = (
        db.query(LessonProgress)
        .join(Lesson, Lesson.id == LessonProgress.lesson_id)
        .filter(Lesson.course_id == course_id, LessonProgress.student_id == student_id, LessonProgress.is_completed.is_(True))
        .count()
    )
    pct = round((completed / total) * 100, 1)

    enrollment = db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id).first()
    if not enrollment:
        return
    enrollment.progress_percent = pct

    if pct >= 100 and enrollment.status != "completed":
        enrollment.status = "completed"
        enrollment.completed_at = datetime.now(timezone.utc)
        _issue_certificate(db, student_id, course_id)


def _issue_certificate(db: Session, student_id: int, course_id: int):
    existing = db.query(Certificate).filter(Certificate.student_id == student_id, Certificate.course_id == course_id).first()
    if existing:
        return
    from app.core.security import generate_certificate_number

    student = db.query(User).filter(User.id == student_id).first()
    course = db.query(Course).filter(Course.id == course_id).first()
    cert_number = generate_certificate_number()
    file_url = generate_certificate_pdf(student.full_name, course.title, cert_number, datetime.now(timezone.utc))

    db.add(Certificate(student_id=student_id, course_id=course_id, certificate_number=cert_number, file_url=file_url))
    notify_certificate_issued(db, student_id, course.title)


# ---------- Enrollment ----------

def _enrollment_out(db: Session, e: Enrollment, include_student: bool = False) -> EnrollmentOut:
    course = db.query(Course).filter(Course.id == e.course_id).first()
    student_name = None
    if include_student:
        student = db.query(User).filter(User.id == e.student_id).first()
        student_name = student.full_name if student else None
    return EnrollmentOut(
        id=e.id, course=_course_card(db, course), status=e.status,
        progress_percent=e.progress_percent, enrolled_at=e.enrolled_at, completed_at=e.completed_at,
        student_id=e.student_id if include_student else None, student_name=student_name,
    )


@router.post("/courses/{course_id}/enroll", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def enroll_in_course(course_id: int, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.status == CourseStatus.published).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found or not published")
    if float(course.price) > 0:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail="This is a paid course. Use /api/payments/checkout to enroll.",
        )

    existing = db.query(Enrollment).filter(Enrollment.student_id == student.id, Enrollment.course_id == course_id).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Already enrolled in this course")

    enrollment = Enrollment(student_id=student.id, course_id=course_id)
    db.add(enrollment)
    db.flush()
    log_action(db, student.id, "enrollment.create", "course", course_id)

    # ============ NOTIFY BOTH STUDENT AND TEACHER ============
    notify_enrollment(db, student.id, course.title)
    if course.teacher_id:
        notify_teacher_new_enrollment(db, course.teacher_id, student.full_name, course.title)

    db.commit()
    db.refresh(enrollment)
    return _enrollment_out(db, enrollment)


@router.get("/my-courses", response_model=list[EnrollmentOut])
def my_courses(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).order_by(Enrollment.enrolled_at.desc()).all()
    return [_enrollment_out(db, e) for e in enrollments]


@router.get("/courses/{course_id}/students", response_model=list[EnrollmentOut])
def course_roster(course_id: int, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    _owned_course(db, course_id, user)
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    return [_enrollment_out(db, e, include_student=True) for e in enrollments]


@router.patch("/enrollments/{enrollment_id}/cancel")
def cancel_enrollment(enrollment_id: int, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id, Enrollment.student_id == student.id).first()
    if not enrollment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    enrollment.status = "cancelled"
    db.commit()
    return {"message": "Enrollment cancelled"}


@router.post("/courses/{course_id}/thumbnail")
def upload_course_thumbnail(course_id: int, file: UploadFile = File(...), user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _owned_course(db, course_id, user)
    url = save_upload(file, "thumbnails")
    course.thumbnail_url = url
    db.commit()
    return {"url": url}