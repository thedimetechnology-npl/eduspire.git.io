from datetime import datetime
from sqlalchemy.orm import Session

from app.models.engagement import Notification


# ==================== CORE HELPER ====================

def notify(db: Session, user_id: int, type: str, title: str, message: str = "") -> Notification:
    """Create a notification. Caller is responsible for db.commit()."""
    n = Notification(user_id=user_id, type=type, title=title, message=message)
    db.add(n)
    db.flush()
    return n


# ==================== STUDENT: ENROLLMENT ====================

def notify_enrollment(db: Session, student_id: int, course_title: str):
    notify(db, student_id, "enrollment", "Enrollment confirmed",
           f'You\'re enrolled in "{course_title}". Happy learning!')


def notify_course_completed(db: Session, student_id: int, course_title: str):
    notify(db, student_id, "course_completed", "Course completed!",
           f'You finished "{course_title}". Great job!')


def notify_payment_success(db: Session, student_id: int, course_title: str, amount: float):
    notify(db, student_id, "payment", "Payment successful",
           f'Payment of ₹{amount:.2f} for "{course_title}" was successful.')


def notify_payment_failed(db: Session, student_id: int, course_title: str, reason: str = ""):
    notify(db, student_id, "payment_failed", "Payment failed",
           f'Payment for "{course_title}" failed. {reason}'.strip())


def notify_refund_processed(db: Session, student_id: int, amount: float):
    notify(db, student_id, "refund", "Refund processed",
           f'A refund of ₹{amount:.2f} has been issued to your account.')


# ==================== STUDENT: ASSIGNMENTS ====================

def notify_new_assignment(db: Session, student_id: int, assignment_title: str, course_title: str):
    notify(db, student_id, "assignment_new", "New assignment posted",
           f'"{assignment_title}" was posted in {course_title}.')


def notify_assignment_graded(db: Session, student_id: int, assignment_title: str,
                             score: float, max_score: float):
    notify(db, student_id, "assignment_graded", "Assignment graded",
           f'"{assignment_title}" was graded: {score}/{max_score}.')


def notify_assignment_due_soon(db: Session, student_id: int, assignment_title: str, hours_left: int):
    notify(db, student_id, "assignment_due", "Assignment due soon",
           f'"{assignment_title}" is due in {hours_left} hours.')


def notify_assignment_overdue(db: Session, student_id: int, assignment_title: str):
    notify(db, student_id, "assignment_overdue", "Assignment overdue",
           f'"{assignment_title}" is past its due date. Submit as soon as possible.')


def notify_assignment_resubmitted(db: Session, teacher_id: int, student_name: str, assignment_title: str):
    notify(db, teacher_id, "assignment_resubmitted", "Assignment resubmitted",
           f'{student_name} resubmitted "{assignment_title}".')


# ==================== STUDENT: QUIZZES ====================

def notify_new_quiz(db: Session, student_id: int, quiz_title: str, course_title: str):
    notify(db, student_id, "quiz_new", "New quiz available",
           f'"{quiz_title}" was added to {course_title}.')


def notify_quiz_result(db: Session, student_id: int, quiz_title: str, score: float, total: float):
    notify(db, student_id, "quiz_result", "Quiz result available",
           f'"{quiz_title}" result: {score}/{total}.')


# ==================== STUDENT: LIVE CLASSES ====================

def notify_live_class_scheduled(db: Session, student_id: int, title: str, scheduled_at):
    notify(db, student_id, "live_class", "Live class scheduled",
           f'"{title}" is scheduled for {scheduled_at.strftime("%b %d, %Y at %H:%M")}.')


def notify_live_class_starting_soon(db: Session, student_id: int, title: str, minutes: int = 15):
    notify(db, student_id, "live_class_starting", "Live class starting soon",
           f'"{title}" starts in {minutes} minutes. Get ready!')


def notify_live_class_started(db: Session, student_id: int, title: str):
    notify(db, student_id, "live_class_started", "Live class started",
           f'"{title}" is live now. Join the session!')


def notify_live_class_cancelled(db: Session, student_id: int, title: str):
    notify(db, student_id, "live_class_cancelled", "Live class cancelled",
           f'"{title}" has been cancelled.')


def notify_live_class_updated(db: Session, student_id: int, title: str, new_time):
    notify(db, student_id, "live_class_updated", "Live class rescheduled",
           f'"{title}" was rescheduled to {new_time.strftime("%b %d, %Y at %H:%M")}.')


def notify_recording_available(db: Session, student_id: int, title: str):
    notify(db, student_id, "recording_available", "Recording available",
           f'The recording for "{title}" is now available.')


# ==================== STUDENT: ATTENDANCE ====================

def notify_attendance_marked(db: Session, student_id: int, course_title: str, status: str):
    notify(db, student_id, "attendance", "Attendance marked",
           f'You were marked {status} in {course_title}.')


def notify_low_attendance(db: Session, student_id: int, course_title: str, percentage: float):
    notify(db, student_id, "low_attendance", "Attendance warning",
           f'Your attendance in {course_title} is {percentage:.1f}%. Please improve it.')


# ==================== STUDENT: CERTIFICATES ====================

def notify_certificate_issued(db: Session, student_id: int, course_title: str):
    notify(db, student_id, "certificate", "Certificate earned!",
           f'You earned a certificate for completing "{course_title}". Congratulations!')


# ==================== STUDENT: COURSE UPDATES ====================

def notify_course_update(db: Session, student_id: int, course_title: str, note: str):
    notify(db, student_id, "course_update", f"Update in {course_title}", note)


def notify_new_course(db: Session, student_id: int, course_title: str, teacher_name: str):
    notify(db, student_id, "new_course", "New course available",
           f'"{course_title}" by {teacher_name} is now available. Check it out!')


def notify_new_lesson(db: Session, student_id: int, course_title: str, lesson_title: str):
    notify(db, student_id, "new_lesson", "New lesson added",
           f'"{lesson_title}" was added to {course_title}.')


# ==================== STUDENT: QUESTION PAPERS ====================

def notify_question_paper(db: Session, student_id: int, paper_title: str):
    notify(db, student_id, "question_paper", "New question paper",
           f'"{paper_title}" is now available to download.')


# ==================== STUDENT: REVIEWS ====================

def notify_review_reminder(db: Session, student_id: int, course_title: str):
    notify(db, student_id, "review_reminder", "Share your feedback",
           f'How was "{course_title}"? Leave a review to help others.')


# ==================== STUDENT: MESSAGES ====================

def notify_new_message(db: Session, user_id: int, sender_name: str):
    notify(db, user_id, "message", "New message",
           f'{sender_name} sent you a message.')


# ==================== TEACHER NOTIFICATIONS ====================

def notify_teacher_new_enrollment(db: Session, teacher_id: int, student_name: str, course_title: str):
    notify(db, teacher_id, "teacher_enrollment", "New student enrolled",
           f'{student_name} enrolled in "{course_title}".')


def notify_teacher_new_submission(db: Session, teacher_id: int, student_name: str,
                                  assignment_title: str, course_title: str):
    notify(db, teacher_id, "teacher_submission", "New submission received",
           f'{student_name} submitted "{assignment_title}" in {course_title}.')


def notify_teacher_student_dropped(db: Session, teacher_id: int, student_name: str, course_title: str):
    notify(db, teacher_id, "teacher_drop", "Student left course",
           f'{student_name} unenrolled from "{course_title}".')


def notify_teacher_review_posted(db: Session, teacher_id: int, student_name: str,
                                 course_title: str, rating: int):
    notify(db, teacher_id, "teacher_review", "New review received",
           f'{student_name} rated "{course_title}" {rating}/5 stars.')


def notify_teacher_payment(db: Session, teacher_id: int, amount: float, course_title: str):
    notify(db, teacher_id, "teacher_payment", "Payment received",
           f'You earned ₹{amount:.2f} from "{course_title}".')


def notify_teacher_live_class_reminder(db: Session, teacher_id: int, title: str, minutes: int = 30):
    notify(db, teacher_id, "teacher_live_reminder", "Upcoming live class",
           f'Your live class "{title}" starts in {minutes} minutes.')


# ==================== ADMIN NOTIFICATIONS ====================

def notify_admin_new_user(db: Session, admin_id: int, user_name: str, role: str):
    notify(db, admin_id, "admin_new_user", "New user registered",
           f'{user_name} registered as a {role}.')


def notify_admin_new_course_pending(db: Session, admin_id: int, course_title: str, teacher_name: str):
    notify(db, admin_id, "admin_course_pending", "Course pending approval",
           f'"{course_title}" by {teacher_name} is awaiting approval.')


def notify_admin_payment_issue(db: Session, admin_id: int, details: str):
    notify(db, admin_id, "admin_payment_issue", "Payment issue detected", details)


def notify_admin_system_alert(db: Session, admin_id: int, title: str, message: str):
    notify(db, admin_id, "admin_alert", title, message)


# ==================== BULK HELPERS ====================

def notify_all_students(db: Session, type: str, title: str, message: str):
    """Send a notification to every student. Use sparingly (announcements only)."""
    from app.models.user import User
    students = db.query(User).filter(User.role == "student").all()
    for s in students:
        notify(db, s.id, type, title, message)


def notify_course_students(db: Session, course_id: int, type: str, title: str, message: str):
    """Send a notification to all active students enrolled in a course."""
    from app.models.academic import Enrollment
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == "active",
    ).all()
    for e in enrollments:
        notify(db, e.student_id, type, title, message)


def notify_all_teachers(db: Session, type: str, title: str, message: str):
    """Send a notification to every teacher."""
    from app.models.user import User
    teachers = db.query(User).filter(User.role == "teacher").all()
    for t in teachers:
        notify(db, t.id, type, title, message)


def notify_all_admins(db: Session, type: str, title: str, message: str):
    """Send a notification to every admin."""
    from app.models.user import User
    admins = db.query(User).filter(User.role == "admin").all()
    for a in admins:
        notify(db, a.id, type, title, message)