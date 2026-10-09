from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.academic import Course, Enrollment
from app.models.engagement import Attendance, Certificate, LiveClass, Notification, Review
from app.models.assessment import Assignment, Quiz
from app.models.user import User
from app.schemas.engagement import (
    AttendanceOut, AttendanceSummary, BulkAttendanceMark, CalendarEvent, CertificateOut, CertificateVerify,
    LiveClassCreate, LiveClassOut, LiveClassUpdate, NotificationOut, ReviewCreate, ReviewOut,
)
from app.services.notification_service import notify_live_class_scheduled

router = APIRouter()


# ---------- Live classes ----------

@router.post("/live-classes", response_model=LiveClassOut, status_code=status.HTTP_201_CREATED)
def schedule_live_class(payload: LiveClassCreate, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    if teacher.role.value == "teacher" and course.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only schedule classes for your own courses")

    live_class = LiveClass(**payload.model_dump(), teacher_id=teacher.id)
    db.add(live_class)
    db.flush()

    for e in db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.status == "active"):
        notify_live_class_scheduled(db, e.student_id, live_class.title, live_class.scheduled_at)

    db.commit()
    db.refresh(live_class)
    return _live_class_out(db, live_class)


def _live_class_out(db: Session, lc: LiveClass) -> LiveClassOut:
    course = db.query(Course).filter(Course.id == lc.course_id).first()
    teacher = db.query(User).filter(User.id == lc.teacher_id).first()
    return LiveClassOut(
        id=lc.id, course_id=lc.course_id, course_title=course.title if course else None,
        teacher_id=lc.teacher_id, teacher_name=teacher.full_name if teacher else None,
        title=lc.title, description=lc.description, scheduled_at=lc.scheduled_at,
        duration_minutes=lc.duration_minutes, meeting_link=lc.meeting_link, recording_link=lc.recording_link,
    )


@router.get("/live-classes", response_model=list[LiveClassOut])
def list_live_classes(course_id: int = None, upcoming_only: bool = False, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    query = db.query(LiveClass)
    if course_id:
        query = query.filter(LiveClass.course_id == course_id)
    if user.role.value == "student":
        course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == user.id)]
        query = query.filter(LiveClass.course_id.in_(course_ids or [0]))
    elif user.role.value == "teacher":
        query = query.filter(LiveClass.teacher_id == user.id)
    if upcoming_only:
        query = query.filter(LiveClass.scheduled_at >= datetime.now(timezone.utc))
    return [_live_class_out(db, lc) for lc in query.order_by(LiveClass.scheduled_at).all()]


@router.put("/live-classes/{live_class_id}", response_model=LiveClassOut)
def update_live_class(live_class_id: int, payload: LiveClassUpdate, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    lc = db.query(LiveClass).filter(LiveClass.id == live_class_id).first()
    if not lc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Live class not found")
    if teacher.role.value == "teacher" and lc.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only update your own live classes")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lc, field, value)
    db.commit()
    db.refresh(lc)
    return _live_class_out(db, lc)


@router.delete("/live-classes/{live_class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_live_class(live_class_id: int, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    lc = db.query(LiveClass).filter(LiveClass.id == live_class_id).first()
    if lc:
        if teacher.role.value == "teacher" and lc.teacher_id != teacher.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only delete your own live classes")
        db.delete(lc)
        db.commit()


@router.get("/calendar", response_model=list[CalendarEvent])
def get_calendar(user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    events: list[CalendarEvent] = []

    if user.role.value == "student":
        course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == user.id, Enrollment.status == "active")]
    elif user.role.value == "teacher":
        course_ids = [c.id for c in db.query(Course).filter(Course.teacher_id == user.id)]
    else:
        course_ids = [c.id for c in db.query(Course).all()]

    for lc in db.query(LiveClass).filter(LiveClass.course_id.in_(course_ids or [0])):
        course = db.query(Course).filter(Course.id == lc.course_id).first()
        events.append(CalendarEvent(
            type="live_class",
            title=lc.title,
            course_title=course.title if course else None,
            date=lc.scheduled_at,
            ref_id=lc.id,
            meeting_link=lc.meeting_link,
        ))

    for a in db.query(Assignment).filter(Assignment.course_id.in_(course_ids or [0]), Assignment.due_date.isnot(None)):
        course = db.query(Course).filter(Course.id == a.course_id).first()
        events.append(CalendarEvent(type="assignment_due", title=a.title, course_title=course.title if course else None, date=a.due_date, ref_id=a.id))

    for q in db.query(Quiz).filter(Quiz.course_id.in_(course_ids or [0])):
        course = db.query(Course).filter(Course.id == q.course_id).first()
        events.append(CalendarEvent(type="quiz", title=q.title, course_title=course.title if course else None, date=q.created_at, ref_id=q.id))

    return sorted(events, key=lambda e: e.date)


# ---------- Attendance ----------

@router.post("/attendance/mark")
def mark_attendance(payload: BulkAttendanceMark, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    live_class = db.query(LiveClass).filter(
        LiveClass.id == payload.live_class_id,
        LiveClass.course_id == payload.course_id,
    ).first()
    if not course or not live_class:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course or live class not found")
    if teacher.role.value == "teacher" and live_class.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only mark attendance for your own class")

    enrolled_ids = {
        student_id for (student_id,) in db.query(Enrollment.student_id).filter(
            Enrollment.course_id == payload.course_id,
            Enrollment.status == "active",
        ).all()
    }
    for record in payload.records:
        if record.student_id not in enrolled_ids or record.course_id != payload.course_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Attendance includes an invalid student")
        existing = None
        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.live_class_id == payload.live_class_id,
        ).first()
        if existing:
            existing.status = record.status
        else:
            db.add(Attendance(
                student_id=record.student_id, course_id=payload.course_id,
                live_class_id=payload.live_class_id, marked_by=teacher.id, status=record.status,
            ))
    db.commit()
    return {"message": f"Marked attendance for {len(payload.records)} students"}


@router.get("/attendance/course/{course_id}", response_model=list[AttendanceOut])
def course_attendance(course_id: int, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    if teacher.role.value == "teacher" and course.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only view attendance for your own courses")
    records = db.query(Attendance).filter(Attendance.course_id == course_id).order_by(Attendance.date.desc()).all()
    out = []
    for r in records:
        student = db.query(User).filter(User.id == r.student_id).first()
        out.append(AttendanceOut(
            id=r.id, student_id=r.student_id, student_name=student.full_name if student else None,
            course_id=r.course_id, course_title=course.title, live_class_id=r.live_class_id,
            date=r.date, status=r.status,
        ))
    return out


@router.get("/attendance/my", response_model=list[AttendanceSummary])
def my_attendance(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == student.id)]
    summaries = []
    for cid in course_ids:
        course = db.query(Course).filter(Course.id == cid).first()
        records = db.query(Attendance).filter(Attendance.course_id == cid, Attendance.student_id == student.id).all()
        if not records:
            continue
        present = sum(1 for r in records if r.status == "present")
        late = sum(1 for r in records if r.status == "late")
        absent = sum(1 for r in records if r.status == "absent")
        summaries.append(AttendanceSummary(
            course_id=cid, course_title=course.title if course else "", total_sessions=len(records),
            present_count=present, late_count=late, absent_count=absent,
            percentage=round((present + late) / len(records) * 100, 1),
        ))
    return summaries


# ---------- Certificates ----------

@router.get("/certificates/my", response_model=list[CertificateOut])
def my_certificates(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    certs = db.query(Certificate).filter(Certificate.student_id == student.id).order_by(Certificate.issued_at.desc()).all()
    return [_certificate_out(db, c) for c in certs]


def _certificate_out(db: Session, c: Certificate) -> CertificateOut:
    student = db.query(User).filter(User.id == c.student_id).first()
    course = db.query(Course).filter(Course.id == c.course_id).first()
    return CertificateOut(
        id=c.id, student_id=c.student_id, student_name=student.full_name if student else None,
        course_id=c.course_id, course_title=course.title if course else None,
        certificate_number=c.certificate_number, file_url=c.file_url, issued_at=c.issued_at,
    )


@router.get("/certificates/course/{course_id}", response_model=list[CertificateOut])
def course_certificates(course_id: int, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    if teacher.role.value == "teacher" and course.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only view certificates for your own courses")
    certs = db.query(Certificate).filter(Certificate.course_id == course_id).all()
    return [_certificate_out(db, c) for c in certs]


@router.get("/certificates/verify/{certificate_number}", response_model=CertificateVerify)
def verify_certificate(certificate_number: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
    if not cert:
        return CertificateVerify(valid=False)
    student = db.query(User).filter(User.id == cert.student_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()
    return CertificateVerify(
        valid=True, student_name=student.full_name if student else None,
        course_title=course.title if course else None, issued_at=cert.issued_at,
        certificate_number=cert.certificate_number,
    )


# ---------- Notifications ----------

@router.get("/notifications/my", response_model=list[NotificationOut])
def my_notifications(user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "ok"}


@router.patch("/notifications/read-all")
def mark_all_read(user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"message": "ok"}


# ---------- Reviews ----------

@router.post("/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(payload: ReviewCreate, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.student_id == student.id, Enrollment.course_id == payload.course_id).first()
    if not enrollment:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You must be enrolled to review this course")

    existing = db.query(Review).filter(Review.student_id == student.id, Review.course_id == payload.course_id).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        review = existing
    else:
        review = Review(student_id=student.id, course_id=payload.course_id, rating=payload.rating, comment=payload.comment)
        db.add(review)

    db.commit()
    db.refresh(review)
    return ReviewOut(id=review.id, student_id=student.id, student_name=student.full_name, course_id=review.course_id,
                      rating=review.rating, comment=review.comment, created_at=review.created_at)


@router.get("/reviews/course/{course_id}", response_model=list[ReviewOut])
def course_reviews(course_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.course_id == course_id).order_by(Review.created_at.desc()).all()
    out = []
    for r in reviews:
        student = db.query(User).filter(User.id == r.student_id).first()
        out.append(ReviewOut(id=r.id, student_id=r.student_id, student_name=student.full_name if student else None,
                              course_id=r.course_id, rating=r.rating, comment=r.comment, created_at=r.created_at))
    return out
