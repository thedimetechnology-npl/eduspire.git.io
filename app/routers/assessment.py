from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.core.audit import log_action
from app.models.academic import Course, Enrollment
from app.models.assessment import (
    Assignment, AssignmentSubmission, Question, QuestionPaper, QuestionPaperBookmark, Quiz, QuizAttempt,
)
from app.models.user import User
from app.schemas.assessment import (
    AssignmentCreate, AssignmentOut, AttemptResult, GradeSubmission, QuestionForStudent, QuestionForTeacher,
    QuestionPaperCreate, QuestionPaperOut, QuizCreate, QuizForAttempt, QuizForEdit, QuizOut, StartAttemptResponse,
    SubmissionCreate, SubmissionOut, SubmitAttempt,
)
from app.services.file_service import save_upload
from app.services.notification_service import notify_assignment_graded, notify_new_assignment

router = APIRouter()


def _assessment_course(db: Session, course_id: int, user: User, *, require_enrollment: bool = False) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found")
    if user.role.value == "teacher" and course.teacher_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only manage your own course")
    if require_enrollment and user.role.value == "student":
        enrolled = db.query(Enrollment).filter(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course_id,
            Enrollment.status.in_(["active", "completed"]),
        ).first()
        if not enrolled:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this course")
    return course


# ---------- Assignments ----------

def _assignment_out(db: Session, a: Assignment, student_id: Optional[int] = None) -> AssignmentOut:
    course = db.query(Course).filter(Course.id == a.course_id).first()
    sub = None
    if student_id:
        sub = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == a.id, AssignmentSubmission.student_id == student_id
        ).first()
    sub_count = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).count()
    return AssignmentOut(
        id=a.id, course_id=a.course_id, course_title=course.title if course else None,
        title=a.title, description=a.description, due_date=a.due_date, max_score=a.max_score,
        created_at=a.created_at, my_submission_id=sub.id if sub else None,
        my_score=sub.score if sub else None, submission_count=sub_count,
    )


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(payload: AssignmentCreate, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _assessment_course(db, payload.course_id, teacher)
    assignment = Assignment(**payload.model_dump())
    db.add(assignment)
    db.flush()
    log_action(db, teacher.id, "assignment.create", "assignment", assignment.id)

    for e in db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.status == "active"):
        notify_new_assignment(db, e.student_id, assignment.title, course.title)

    db.commit()
    db.refresh(assignment)
    return _assignment_out(db, assignment)


@router.get("/courses/{course_id}/assignments", response_model=list[AssignmentOut])
def list_assignments(course_id: int, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    _assessment_course(db, course_id, user, require_enrollment=True)
    assignments = db.query(Assignment).filter(Assignment.course_id == course_id).order_by(Assignment.due_date).all()
    student_id = user.id if user.role.value == "student" else None
    return [_assignment_out(db, a, student_id) for a in assignments]


@router.get("/assignments/my", response_model=list[AssignmentOut])
def my_assignments(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == student.id, Enrollment.status == "active")]
    assignments = db.query(Assignment).filter(Assignment.course_id.in_(course_ids or [0])).order_by(Assignment.due_date).all()
    return [_assignment_out(db, a, student.id) for a in assignments]


@router.post("/assignments/submit", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def submit_assignment(payload: SubmissionCreate, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == payload.assignment_id).first()
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _assessment_course(db, assignment.course_id, student, require_enrollment=True)
    if assignment.due_date and datetime.now(timezone.utc) > assignment.due_date.replace(tzinfo=timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="The assignment deadline has passed")

    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == payload.assignment_id, AssignmentSubmission.student_id == student.id
    ).first()
    if existing:
        existing.file_url = payload.file_url
        existing.notes = payload.notes
        existing.submitted_at = datetime.now(timezone.utc)
        submission = existing
    else:
        submission = AssignmentSubmission(
            assignment_id=payload.assignment_id, student_id=student.id,
            file_url=payload.file_url, notes=payload.notes,
        )
        db.add(submission)

    db.commit()
    db.refresh(submission)
    return SubmissionOut(
        id=submission.id, assignment_id=submission.assignment_id, student_id=submission.student_id,
        student_name=student.full_name, file_url=submission.file_url, notes=submission.notes,
        submitted_at=submission.submitted_at, score=submission.score, feedback=submission.feedback,
        graded_at=submission.graded_at,
    )


@router.post("/assignments/upload")
def upload_submission_file(file: UploadFile = File(...), student: User = Depends(require_role("student"))):
    return {"url": save_upload(file, "submissions")}


@router.get("/assignments/{assignment_id}/submissions", response_model=list[SubmissionOut])
def list_submissions(assignment_id: int, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _assessment_course(db, assignment.course_id, teacher)
    subs = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).all()
    out = []
    for s in subs:
        student = db.query(User).filter(User.id == s.student_id).first()
        out.append(SubmissionOut(
            id=s.id, assignment_id=s.assignment_id, student_id=s.student_id,
            student_name=student.full_name if student else None, file_url=s.file_url, notes=s.notes,
            submitted_at=s.submitted_at, score=s.score, feedback=s.feedback, graded_at=s.graded_at,
        ))
    return out


@router.patch("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade_submission(submission_id: int, payload: GradeSubmission, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _assessment_course(db, assignment.course_id, teacher)

    submission.score = payload.score
    submission.feedback = payload.feedback
    submission.graded_at = datetime.now(timezone.utc)
    log_action(db, teacher.id, "submission.grade", "assignment_submission", submission.id)

    notify_assignment_graded(db, submission.student_id, assignment.title, payload.score, assignment.max_score)

    db.commit()
    db.refresh(submission)
    student = db.query(User).filter(User.id == submission.student_id).first()
    return SubmissionOut(
        id=submission.id, assignment_id=submission.assignment_id, student_id=submission.student_id,
        student_name=student.full_name if student else None, file_url=submission.file_url, notes=submission.notes,
        submitted_at=submission.submitted_at, score=submission.score, feedback=submission.feedback,
        graded_at=submission.graded_at,
    )


# ---------- Quizzes ----------

@router.post("/quizzes", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(payload: QuizCreate, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    course = _assessment_course(db, payload.course_id, teacher)

    quiz = Quiz(course_id=payload.course_id, title=payload.title, duration_minutes=payload.duration_minutes)
    db.add(quiz)
    db.flush()

    total_marks = 0
    for q in payload.questions:
        if not (0 <= q.correct_index < len(q.options)):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"correct_index out of range for question: {q.text[:40]}")
        db.add(Question(quiz_id=quiz.id, text=q.text, options=q.options, correct_index=q.correct_index, marks=q.marks, topic_tag=q.topic_tag))
        total_marks += q.marks

    log_action(db, teacher.id, "quiz.create", "quiz", quiz.id)
    db.commit()
    return QuizOut(
        id=quiz.id, course_id=quiz.course_id, course_title=course.title, title=quiz.title,
        duration_minutes=quiz.duration_minutes, question_count=len(payload.questions),
        total_marks=total_marks, created_at=quiz.created_at, best_score=None, attempt_count=0,
    )


@router.get("/courses/{course_id}/quizzes", response_model=list[QuizOut])
def list_quizzes(course_id: int, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    _assessment_course(db, course_id, user, require_enrollment=True)
    quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
    course = db.query(Course).filter(Course.id == course_id).first()
    out = []
    for q in quizzes:
        qc = db.query(Question).filter(Question.quiz_id == q.id).count()
        total_marks = sum(x.marks for x in db.query(Question).filter(Question.quiz_id == q.id))
        best, attempt_count = None, 0
        if user.role.value == "student":
            attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id, QuizAttempt.student_id == user.id, QuizAttempt.submitted_at.isnot(None)).all()
            attempt_count = len(attempts)
            if attempts:
                best = max(a.score for a in attempts)
        out.append(QuizOut(
            id=q.id, course_id=q.course_id, course_title=course.title if course else None, title=q.title,
            duration_minutes=q.duration_minutes, question_count=qc, total_marks=total_marks,
            created_at=q.created_at, best_score=best, attempt_count=attempt_count,
        ))
    return out


@router.get("/quizzes/{quiz_id}/edit", response_model=QuizForEdit)
def get_quiz_for_edit(quiz_id: int, teacher: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    _assessment_course(db, quiz.course_id, teacher)
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    return QuizForEdit(
        id=quiz.id, title=quiz.title, duration_minutes=quiz.duration_minutes,
        questions=[QuestionForTeacher.model_validate(q) for q in questions],
    )


@router.post("/quizzes/{quiz_id}/attempt", response_model=StartAttemptResponse, status_code=status.HTTP_201_CREATED)
def start_attempt(quiz_id: int, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    _assessment_course(db, quiz.course_id, student, require_enrollment=True)

    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    if not questions:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This quiz has no questions yet")

    quiz_payload = QuizForAttempt(
        id=quiz.id, title=quiz.title, duration_minutes=quiz.duration_minutes,
        questions=[QuestionForStudent.model_validate(q) for q in questions],
    )
    limit_seconds = quiz.duration_minutes * 60 if quiz.duration_minutes else None

    open_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student.id,
        QuizAttempt.submitted_at.is_(None),
    ).first()
    if open_attempt:
        started = open_attempt.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        if limit_seconds is None or elapsed <= limit_seconds + 30:
            remaining = max(1, int(limit_seconds - elapsed)) if limit_seconds else None
            return StartAttemptResponse(
                attempt_id=open_attempt.id, quiz=quiz_payload,
                started_at=open_attempt.started_at, resumed=True,
                seconds_left=remaining if remaining is not None else 0,
            )
        # Open attempt timed out — auto-close it so a fresh attempt can start
        score, total = 0.0, 0.0
        saved = open_attempt.answers or {}
        for q in questions:
            total += q.marks
            chosen = saved.get(str(q.id), saved.get(q.id))
            if chosen is not None and chosen == q.correct_index:
                score += q.marks
        open_attempt.score = score
        open_attempt.total_marks = total
        open_attempt.submitted_at = datetime.now(timezone.utc)
        db.commit()

    attempt = QuizAttempt(quiz_id=quiz_id, student_id=student.id, answers={})
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return StartAttemptResponse(
        attempt_id=attempt.id,
        quiz=quiz_payload,
        started_at=attempt.started_at,
        resumed=False,
        seconds_left=limit_seconds if limit_seconds is not None else 0,
    )


@router.post("/quizzes/attempt/{attempt_id}/submit", response_model=AttemptResult)
def submit_attempt(attempt_id: int, payload: SubmitAttempt, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.student_id == student.id).first()
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.submitted_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This attempt was already submitted")

    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    if quiz and quiz.duration_minutes:
        started = attempt.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        grace = 30
        if elapsed > quiz.duration_minutes * 60 + grace:
            attempt.submitted_at = datetime.now(timezone.utc)
            db.commit()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Time limit exceeded for this quiz")

    questions = db.query(Question).filter(Question.quiz_id == attempt.quiz_id).all()
    score, total = 0.0, 0.0
    for q in questions:
        total += q.marks
        chosen = payload.answers.get(q.id)
        if chosen is not None and chosen == q.correct_index:
            score += q.marks

    attempt.answers = {str(k): v for k, v in payload.answers.items()}
    attempt.score = score
    attempt.total_marks = total
    attempt.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)

    return AttemptResult(
        id=attempt.id, quiz_id=attempt.quiz_id, quiz_title=quiz.title if quiz else None,
        student_id=student.id, student_name=student.full_name, score=score, total_marks=total,
        started_at=attempt.started_at, submitted_at=attempt.submitted_at,
    )


@router.get("/quizzes/{quiz_id}/attempts", response_model=list[AttemptResult])
def quiz_score_history(quiz_id: int, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    _assessment_course(db, quiz.course_id, user, require_enrollment=True)
    query = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.submitted_at.isnot(None))
    if user.role.value == "student":
        query = query.filter(QuizAttempt.student_id == user.id)
    out = []
    for a in query.order_by(QuizAttempt.submitted_at.desc()).all():
        student = db.query(User).filter(User.id == a.student_id).first()
        out.append(AttemptResult(
            id=a.id, quiz_id=a.quiz_id, quiz_title=quiz.title if quiz else None, student_id=a.student_id,
            student_name=student.full_name if student else None, score=a.score, total_marks=a.total_marks,
            started_at=a.started_at, submitted_at=a.submitted_at,
        ))
    return out


# ---------- Question papers ----------

@router.post("/question-papers", response_model=QuestionPaperOut, status_code=status.HTTP_201_CREATED)
def upload_question_paper(payload: QuestionPaperCreate, user: User = Depends(require_role("teacher", "admin")), db: Session = Depends(get_db)):
    paper = QuestionPaper(**payload.model_dump(), uploaded_by=user.id)
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return QuestionPaperOut(**{**payload.model_dump(), "id": paper.id, "uploaded_by": user.id, "created_at": paper.created_at, "is_bookmarked": False})


@router.post("/question-papers/upload-file")
def upload_question_paper_file(file: UploadFile = File(...), user: User = Depends(require_role("teacher", "admin"))):
    return {"url": save_upload(file, "question-papers")}


@router.get("/question-papers", response_model=list[QuestionPaperOut])
def list_question_papers(subject: Optional[str] = None, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    query = db.query(QuestionPaper)
    if subject:
        query = query.filter(QuestionPaper.subject.ilike(f"%{subject}%"))
    papers = query.order_by(QuestionPaper.created_at.desc()).all()

    bookmarked_ids = set()
    if user.role.value == "student":
        bookmarked_ids = {b.question_paper_id for b in db.query(QuestionPaperBookmark).filter(QuestionPaperBookmark.student_id == user.id)}

    return [
        QuestionPaperOut(
            id=p.id, title=p.title, subject=p.subject, year=p.year, file_url=p.file_url,
            uploaded_by=p.uploaded_by, created_at=p.created_at, is_bookmarked=p.id in bookmarked_ids,
        ) for p in papers
    ]


@router.post("/question-papers/{paper_id}/bookmark")
def bookmark_question_paper(paper_id: int, student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    existing = db.query(QuestionPaperBookmark).filter(
        QuestionPaperBookmark.student_id == student.id, QuestionPaperBookmark.question_paper_id == paper_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False}
    db.add(QuestionPaperBookmark(student_id=student.id, question_paper_id=paper_id))
    db.commit()
    return {"bookmarked": True}


@router.get("/question-papers/bookmarks", response_model=list[QuestionPaperOut])
def my_bookmarks(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    ids = [b.question_paper_id for b in db.query(QuestionPaperBookmark).filter(QuestionPaperBookmark.student_id == student.id)]
    papers = db.query(QuestionPaper).filter(QuestionPaper.id.in_(ids or [0])).all()
    return [
        QuestionPaperOut(id=p.id, title=p.title, subject=p.subject, year=p.year, file_url=p.file_url,
                          uploaded_by=p.uploaded_by, created_at=p.created_at, is_bookmarked=True)
        for p in papers
    ]
