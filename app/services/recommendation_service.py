from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)
from app.models.academic import Course, CourseStatus, Enrollment
from app.models.assessment import Assignment, Question, Quiz, QuizAttempt
from app.models.engagement import LiveClass, Review

_FAQ = {
    "enroll": "Open a course from the Course Catalog and click 'Enroll'. Free courses activate instantly; paid courses go through checkout first.",
    "password": "Click 'Forgot password' on the login page and follow the emailed reset link. It expires after 1 hour.",
    "certificate": "Certificates are issued automatically once your progress in a course reaches 100%. Find them under Certificates in your dashboard.",
    "assignment": "Open the course, go to Assignments, and use 'Submit' to upload your file before the deadline shown.",
    "quiz": "Quizzes are timed once started, so make sure you're ready. Your score and history are saved under Quizzes.",
    "live class": "Upcoming live classes appear on your Dashboard and Calendar with a join link that activates near the scheduled time.",
    "payment": "Go to a paid course and click Enroll to start checkout. All payments and invoices are listed under Payments.",
    "attendance": "Your attendance percentage per course is visible under the Attendance tab, tracked from live classes.",
}


def _rule_based_faq(question: str) -> str:
    q = question.lower()
    for key, answer in _FAQ.items():
        if key in q:
            return answer
    return (
        "I couldn't match that to a specific topic yet. Try asking about enrolling, "
        "assignments, quizzes, certificates, live classes, payments, or attendance — "
        "or reach out to your course teacher directly via Messages."
    )


def ai_faq_answer(question: str) -> tuple[str, str]:
    """Returns (answer, source) where source is 'claude' or 'rule_based'."""
    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{
                    "role": "user",
                    "content": (
                        "You are the support assistant inside EduSphere Pro, a learning "
                        "management system. Answer concisely and helpfully in under 80 words. "
                        f"Student question: {question}"
                    ),
                }],
            )
            text = "".join(block.text for block in resp.content if getattr(
                block, "type", "") == "text")
            if text.strip():
                return text.strip(), "claude"
        except Exception:
            logger.exception("Anthropic API call failed, falling back to rule-based FAQ")
    return _rule_based_faq(question), "rule_based"


def recommend_courses(db: Session, student_id: int, limit: int = 5) -> list[dict]:
    enrolled_ids = {e.course_id for e in db.query(
        Enrollment).filter(Enrollment.student_id == student_id)}
    enrolled_category_ids = {
        c.category_id for c in db.query(Course).filter(Course.id.in_(enrolled_ids)) if c.category_id
    }

    query = db.query(Course).filter(
        Course.status == CourseStatus.published, ~Course.id.in_(enrolled_ids or [0]))

    results = []
    if enrolled_category_ids:
        for course in query.filter(Course.category_id.in_(enrolled_category_ids)).limit(limit):
            results.append({"course_id": course.id, "title": course.title,
                           "reason": "Based on subjects you're already learning"})

    if len(results) < limit:
        seen = {r["course_id"] for r in results}
        popular = (
            db.query(Course.id, Course.title, func.count(
                Enrollment.id).label("cnt"))
            .join(Enrollment, Enrollment.course_id == Course.id, isouter=True)
            .filter(Course.status == CourseStatus.published, ~Course.id.in_(enrolled_ids or [0]))
            .group_by(Course.id).order_by(func.count(Enrollment.id).desc()).limit(limit)
        )
        for cid, title, _ in popular:
            if cid not in seen:
                results.append({"course_id": cid, "title": title,
                               "reason": "Popular with other students"})
                seen.add(cid)

    return results[:limit]


def detect_weak_topics(db: Session, student_id: int, threshold: float = 60.0) -> list[dict]:
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.student_id == student_id, QuizAttempt.submitted_at.isnot(None))
        .all()
    )
    topic_correct = defaultdict(int)
    topic_total = defaultdict(int)

    for attempt in attempts:
        questions = db.query(Question).filter(
            Question.quiz_id == attempt.quiz_id).all()
        answers = attempt.answers or {}
        for q in questions:
            tag = q.topic_tag or "General"
            chosen = answers.get(str(q.id), answers.get(q.id))
            topic_total[tag] += 1
            if chosen is not None and int(chosen) == q.correct_index:
                topic_correct[tag] += 1

    weak = []
    for tag, total in topic_total.items():
        if total == 0:
            continue
        accuracy = round((topic_correct[tag] / total) * 100, 1)
        if accuracy < threshold:
            weak.append({"topic": tag, "accuracy_percent": accuracy,
                        "questions_attempted": total})

    return sorted(weak, key=lambda x: x["accuracy_percent"])


def build_study_planner(db: Session, student_id: int) -> list[dict]:
    enrolled_course_ids = [e.course_id for e in db.query(Enrollment).filter(
        Enrollment.student_id == student_id, Enrollment.status == "active"
    )]
    if not enrolled_course_ids:
        return []

    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=14)
    plan = []

    assignments = db.query(Assignment).filter(
        Assignment.course_id.in_(enrolled_course_ids),
        Assignment.due_date.isnot(None),
    ).all()
    for a in assignments:
        due = a.due_date
        if due and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if due and now <= due <= horizon:
            course = db.query(Course).filter(Course.id == a.course_id).first()
            days_left = (due - now).days
            plan.append({
                "title": a.title, "type": "assignment", "due_date": a.due_date,
                "course_title": course.title if course else None,
                "priority": "high" if days_left <= 2 else "normal",
            })

    live_classes = db.query(LiveClass).filter(
        LiveClass.course_id.in_(enrolled_course_ids),
        LiveClass.scheduled_at >= now, LiveClass.scheduled_at <= horizon,
    ).all()
    for lc in live_classes:
        plan.append({
            "title": lc.title, "type": "live_class", "due_date": lc.scheduled_at,
            "course_title": None, "priority": "normal",
        })

    plan.sort(key=lambda x: x["due_date"] or now)
    return plan
