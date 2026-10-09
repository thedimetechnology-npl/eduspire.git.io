from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.academic import Course, CourseStatus, Enrollment
from app.models.assessment import AssignmentSubmission, Assignment, QuizAttempt
from app.models.engagement import Certificate, LiveClass, Review
from app.models.commerce import Payment, PaymentStatus
from app.models.system import AuditLog
from app.models.user import RoleEnum, User


def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _bucket_by_month(dates: list, months_back: int = 6) -> list[dict]:
    now = datetime.now(timezone.utc)
    labels = []
    cursor = now.replace(day=1)
    for _ in range(months_back):
        labels.append(cursor.strftime("%Y-%m"))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    labels.reverse()

    counts = defaultdict(float)
    for d in dates:
        if d is None:
            continue
        key = _month_key(_aware(d))
        if key in labels:
            counts[key] += 1

    return [{"label": lbl, "value": counts.get(lbl, 0)} for lbl in labels]


def _bucket_by_month_sum(pairs: list, months_back: int = 6) -> list[dict]:
    now = datetime.now(timezone.utc)
    labels = []
    cursor = now.replace(day=1)
    for _ in range(months_back):
        labels.append(cursor.strftime("%Y-%m"))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    labels.reverse()

    sums = defaultdict(float)
    for d, val in pairs:
        if d is None:
            continue
        key = _month_key(_aware(d))
        if key in labels:
            sums[key] += val

    return [{"label": lbl, "value": round(sums.get(lbl, 0), 2)} for lbl in labels]


def _bucket_by_day(dates: list, days_back: int = 7) -> list[dict]:
    now = datetime.now(timezone.utc)
    labels = [(now - timedelta(days=i)).strftime("%Y-%m-%d")
              for i in range(days_back - 1, -1, -1)]
    counts = defaultdict(int)
    for d in dates:
        if d is None:
            continue
        key = _aware(d).strftime("%Y-%m-%d")
        if key in labels:
            counts[key] += 1
    return [{"label": lbl[5:], "value": counts.get(lbl, 0)} for lbl in labels]


def student_dashboard(db: Session, student_id: int) -> dict:
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id).all()
    enrolled = len(enrollments)
    completed = sum(1 for e in enrollments if e.status == "completed")
    course_ids = [e.course_id for e in enrollments]

    pending_assignments = (
        db.query(Assignment)
        .filter(Assignment.course_id.in_(course_ids or [0]))
        .outerjoin(
            AssignmentSubmission,
            (AssignmentSubmission.assignment_id == Assignment.id)
            & (AssignmentSubmission.student_id == student_id),
        )
        .filter(AssignmentSubmission.id.is_(None))
        .count()
    )

    now = datetime.now(timezone.utc)
    upcoming_live = (
        db.query(LiveClass)
        .filter(LiveClass.course_id.in_(course_ids or [0]), LiveClass.scheduled_at >= now)
        .count()
    )

    certificates = db.query(Certificate).filter(
        Certificate.student_id == student_id).count()

    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id, QuizAttempt.submitted_at.isnot(
            None)
    ).all()
    avg_score = 0.0
    if attempts:
        pct_scores = [((a.score / a.total_marks) *
                       100 if a.total_marks else 0) for a in attempts]
        avg_score = round(sum(pct_scores) / len(pct_scores), 1)

    overall_progress = round(
        sum(e.progress_percent for e in enrollments) / enrolled, 1) if enrolled else 0.0

    progress_by_course = []
    for e in enrollments[:8]:
        course = db.query(Course).filter(Course.id == e.course_id).first()
        if course:
            progress_by_course.append(
                {"label": course.title[:20], "value": round(e.progress_percent, 1)})

    from app.models.engagement import Notification
    recent = (
        db.query(Notification)
        .filter(Notification.user_id == student_id)
        .order_by(Notification.created_at.desc())
        .limit(5).all()
    )

    return {
        "enrolled_courses": enrolled,
        "completed_courses": completed,
        "pending_assignments": pending_assignments,
        "upcoming_live_classes": upcoming_live,
        "certificates_earned": certificates,
        "average_quiz_score": avg_score,
        "overall_progress": overall_progress,
        "progress_by_course": progress_by_course,
        "recent_notifications": [
            {"id": n.id, "title": n.title, "message": n.message,
                "is_read": n.is_read, "created_at": n.created_at}
            for n in recent
        ],
    }


def teacher_dashboard(db: Session, teacher_id: int) -> dict:
    courses = db.query(Course).filter(Course.teacher_id == teacher_id).all()
    course_ids = [c.id for c in courses]
    published = sum(1 for c in courses if c.status == CourseStatus.published)

    total_students = db.query(Enrollment.student_id).filter(
        Enrollment.course_id.in_(course_ids or [0])
    ).distinct().count()

    pending_submissions = (
        db.query(AssignmentSubmission)
        .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
        .filter(Assignment.course_id.in_(course_ids or [0]), AssignmentSubmission.score.is_(None))
        .count()
    )

    now = datetime.now(timezone.utc)
    upcoming_live = db.query(LiveClass).filter(
        LiveClass.teacher_id == teacher_id, LiveClass.scheduled_at >= now
    ).count()

    ratings = db.query(Review.rating).filter(
        Review.course_id.in_(course_ids or [0])).all()
    avg_rating = round(sum(r[0] for r in ratings) /
                       len(ratings), 2) if ratings else 0.0

    earnings = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.course_id.in_(course_ids or [0]), Payment.status == PaymentStatus.SUCCESS)
        .scalar() or 0
    )

    students_per_course = []
    for c in courses[:8]:
        cnt = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        students_per_course.append({"label": c.title[:20], "value": cnt})

    # ==================== TODAY'S SCHEDULE ====================
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_schedule = []

    # Live classes today (matches teacher)
    live_today = (
        db.query(LiveClass)
        .filter(
            LiveClass.teacher_id == teacher_id,
            LiveClass.scheduled_at >= today_start,
            LiveClass.scheduled_at < today_end,
        )
        .order_by(LiveClass.scheduled_at)
        .all()
    )
    for lc in live_today:
        course = db.query(Course).filter(Course.id == lc.course_id).first()
        end_dt = lc.scheduled_at + timedelta(minutes=lc.duration_minutes or 60)
        today_schedule.append({
            "time": lc.scheduled_at.strftime("%I:%M %p"),
            "end": end_dt.strftime("%I:%M %p"),
            "title": lc.title,
            "type": course.title if course else "Live Class",
            "kind": "live_class",
            "ref_id": lc.id,
        })

    # Assignments due today
    assignments_today = (
        db.query(Assignment)
        .filter(
            Assignment.course_id.in_(course_ids or [0]),
            Assignment.due_date >= today_start,
            Assignment.due_date < today_end,
        )
        .order_by(Assignment.due_date)
        .all()
    )
    for a in assignments_today:
        course = db.query(Course).filter(Course.id == a.course_id).first()
        today_schedule.append({
            "time": a.due_date.strftime("%I:%M %p") if a.due_date else "All day",
            "end": None,
            "title": f"{a.title} — due",
            "type": course.title if course else "Assignment",
            "kind": "assignment",
            "ref_id": a.id,
        })

    today_schedule.sort(key=lambda x: x["time"])

    # ==================== STUDENT PERFORMANCE ====================
    student_performance = []
    for c in courses[:6]:
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.submitted_at.isnot(None),
            QuizAttempt.total_marks > 0,
        ).all()

        if attempts:
            # Average score % across all attempted quizzes in this course
            relevant = []
            for a in attempts:
                # Only count attempts that belong to this course (via Assignment)
                assignment = db.query(Assignment).filter(
                    Assignment.id == a.quiz_id,
                    Assignment.course_id == c.id,
                ).first()
                if assignment:
                    pct = (a.score / a.total_marks) * 100 if a.total_marks else 0
                    relevant.append(pct)
            avg = round(sum(relevant) / len(relevant), 1) if relevant else 0.0
        else:
            avg = 0.0

        student_performance.append({
            "label": c.title[:12],
            "value": avg,
        })

    # ==================== RECENT ASSIGNMENTS ====================
    recent_assignments = []
    assignments = (
        db.query(Assignment)
        .filter(Assignment.course_id.in_(course_ids or [0]))
        .order_by(Assignment.id.desc())
        .limit(5)
        .all()
    )
    for a in assignments:
        sub_count = (
            db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.assignment_id == a.id)
            .count()
        )
        course = db.query(Course).filter(Course.id == a.course_id).first()
        recent_assignments.append({
            "id": a.id,
            "title": a.title,
            "course_title": course.title if course else None,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "submissions": sub_count,
            "max_score": float(a.max_score) if a.max_score else None,
        })

    # ==================== UPCOMING CLASSES ====================
    upcoming_classes = []
    upcoming = (
        db.query(LiveClass)
        .filter(LiveClass.teacher_id == teacher_id, LiveClass.scheduled_at >= now)
        .order_by(LiveClass.scheduled_at)
        .limit(4)
        .all()
    )
    for lc in upcoming:
        course = db.query(Course).filter(Course.id == lc.course_id).first()
        upcoming_classes.append({
            "id": lc.id,
            "title": lc.title,
            "course_title": course.title if course else None,
            "scheduled_at": lc.scheduled_at.isoformat(),
            "duration_minutes": lc.duration_minutes or 60,
            "meeting_link": lc.meeting_link,
        })

    # ==================== RECENT ACTIVITY ====================
    recent_activity = []

    subs = (
        db.query(AssignmentSubmission)
        .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
        .filter(Assignment.course_id.in_(course_ids or [0]))
        .order_by(AssignmentSubmission.submitted_at.desc())
        .limit(3)
        .all()
    )
    for s in subs:
        student = db.query(User).filter(User.id == s.student_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
        recent_activity.append({
            "kind": "submission",
            "text": f"{student.full_name if student else 'A student'} submitted {assignment.title if assignment else 'an assignment'}",
            "at": s.submitted_at.isoformat() if s.submitted_at else None,
        })

    enrolls = (
        db.query(Enrollment)
        .filter(Enrollment.course_id.in_(course_ids or [0]))
        .order_by(Enrollment.enrolled_at.desc())
        .limit(3)
        .all()
    )
    for e in enrolls:
        student = db.query(User).filter(User.id == e.student_id).first()
        course = db.query(Course).filter(Course.id == e.course_id).first()
        recent_activity.append({
            "kind": "enrollment",
            "text": f"{student.full_name if student else 'A student'} enrolled in {course.title if course else 'a course'}",
            "at": e.enrolled_at.isoformat() if e.enrolled_at else None,
        })

    recent_activity.sort(key=lambda x: x.get("at") or "", reverse=True)
    recent_activity = recent_activity[:5]

    return {
        "total_courses": len(courses),
        "published_courses": published,
        "total_students": total_students,
        "pending_submissions": pending_submissions,
        "upcoming_live_classes": upcoming_live,
        "average_rating": avg_rating,
        "earnings_total": float(earnings),
        "students_per_course": students_per_course,
        "today_schedule": today_schedule,
        "student_performance": student_performance,
        "recent_assignments": recent_assignments,
        "upcoming_classes": upcoming_classes,
        "recent_activity": recent_activity,
    }


def admin_dashboard(db: Session) -> dict:
    total_students = db.query(User).filter(
        User.role == RoleEnum.student).count()
    total_teachers = db.query(User).filter(
        User.role == RoleEnum.teacher).count()
    total_courses = db.query(Course).count()
    published_courses = db.query(Course).filter(
        Course.status == CourseStatus.published).count()
    total_enrollments = db.query(Enrollment).count()

    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PaymentStatus.SUCCESS)
        .scalar()
    ) or 0

    payments = db.query(Payment).filter(
        Payment.status == PaymentStatus.SUCCESS).all()
    revenue_by_month = _bucket_by_month_sum(
        [(p.created_at, float(p.amount)) for p in payments])

    users = db.query(User).all()
    signups_by_month = _bucket_by_month([u.created_at for u in users])

    top = (
        db.query(Course.title, func.count(Enrollment.id).label("cnt"))
        .join(Enrollment, Enrollment.course_id == Course.id)
        .group_by(Course.id).order_by(func.count(Enrollment.id).desc()).limit(5).all()
    )

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_enrollments": total_enrollments,
        "total_revenue": float(total_revenue),
        "revenue_by_month": revenue_by_month,
        "signups_by_month": signups_by_month,
        "top_courses": [{"label": t[:20], "value": c} for t, c in top],
    }


def bi_overview(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    logins = db.query(AuditLog).filter(AuditLog.action == "login").all()
    dau = len({l.user_id for l in logins if l.created_at and _aware(
        l.created_at) >= today_start})
    mau = len({l.user_id for l in logins if l.created_at and _aware(
        l.created_at) >= month_start})

    total_enrollments = db.query(Enrollment).count()
    completed = db.query(Enrollment).filter(
        Enrollment.status == "completed").count()
    completion_rate = round((completed / total_enrollments)
                            * 100, 1) if total_enrollments else 0.0

    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == PaymentStatus.SUCCESS)
        .scalar()
    ) or 0

    top_courses = (
        db.query(Course.title, func.count(Enrollment.id))
        .join(Enrollment, Enrollment.course_id == Course.id)
        .group_by(Course.id).order_by(func.count(Enrollment.id).desc()).limit(5).all()
    )

    top_teachers_raw = (
        db.query(User.full_name, func.count(Enrollment.id))
        .join(Course, Course.teacher_id == User.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .group_by(User.id).order_by(func.count(Enrollment.id).desc()).limit(5).all()
    )

    users = db.query(User).filter(User.role == RoleEnum.student).all()
    student_growth = _bucket_by_month([u.created_at for u in users])
    engagement_by_day = _bucket_by_day([l.created_at for l in logins])

    return {
        "dau": dau,
        "mau": mau,
        "course_completion_rate": completion_rate,
        "total_revenue": float(total_revenue),
        "top_courses": [{"label": t[:20], "value": c} for t, c in top_courses],
        "top_teachers": [{"label": t[:20], "value": c} for t, c in top_teachers_raw],
        "student_growth": student_growth,
        "engagement_by_day": engagement_by_day,
    }


def performance_report(db: Session) -> list[dict]:
    from app.models.engagement import Attendance
    students = db.query(User).filter(User.role == RoleEnum.student).all()
    rows = []
    for s in students:
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == s.id).all()
        if not enrollments:
            continue
        completed = sum(1 for e in enrollments if e.status == "completed")
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == s.id, QuizAttempt.submitted_at.isnot(
                None)
        ).all()
        avg_score = 0.0
        if attempts:
            pct = [((a.score / a.total_marks) * 100 if a.total_marks else 0)
                   for a in attempts]
            avg_score = round(sum(pct) / len(pct), 1)

        course_ids = [e.course_id for e in enrollments]
        att_records = db.query(Attendance).filter(
            Attendance.course_id.in_(
                course_ids or [0]), Attendance.student_id == s.id
        ).all()
        att_pct = round(sum(1 for a in att_records if a.status ==
                        "present") / len(att_records) * 100, 1) if att_records else 0.0

        rows.append({
            "student_id": s.id, "student_name": s.full_name,
            "courses_enrolled": len(enrollments), "courses_completed": completed,
            "average_quiz_score": avg_score, "attendance_percentage": att_pct,
        })
    return rows


def course_analytics_report(db: Session) -> list[dict]:
    courses = db.query(Course).all()
    rows = []
    for c in courses:
        enrolled = db.query(Enrollment).filter(
            Enrollment.course_id == c.id).count()
        completed = db.query(Enrollment).filter(
            Enrollment.course_id == c.id, Enrollment.status == "completed").count()
        rate = round((completed / enrolled) * 100, 1) if enrolled else 0.0
        ratings = db.query(Review.rating).filter(
            Review.course_id == c.id).all()
        avg_rating = round(sum(r[0] for r in ratings) /
                           len(ratings), 2) if ratings else 0.0
        revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.course_id == c.id, Payment.status == PaymentStatus.SUCCESS
        ).scalar() or 0
        rows.append({
            "course_id": c.id, "title": c.title, "enrolled_count": enrolled,
            "completion_rate": rate, "average_rating": avg_rating, "revenue": float(revenue),
        })
    return sorted(rows, key=lambda r: r["enrolled_count"], reverse=True)


def attendance_report(db: Session) -> list[dict]:
    from app.models.engagement import Attendance
    courses = db.query(Course).all()
    rows = []
    for c in courses:
        records = db.query(Attendance).filter(
            Attendance.course_id == c.id).all()
        if not records:
            continue
        present = sum(1 for r in records if r.status == "present")
        rows.append({
            "course_id": c.id, "title": c.title, "total_sessions": len(records),
            "present_count": present, "percentage": round(present / len(records) * 100, 1),
        })
    return rows


def revenue_report(db: Session) -> list[dict]:
    payments = db.query(Payment).filter(Payment.status == PaymentStatus.SUCCESS).all()
    return _bucket_by_month_sum([(p.created_at, float(p.amount)) for p in payments], months_back=12)