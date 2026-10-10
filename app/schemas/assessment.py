from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---- Assignments ----

class AssignmentCreate(BaseModel):
    course_id: int
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: float = 100


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    course_title: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_score: float
    created_at: datetime
    my_submission_id: Optional[int] = None
    my_score: Optional[float] = None
    submission_count: int = 0


class SubmissionCreate(BaseModel):
    assignment_id: int
    file_url: Optional[str] = None
    notes: Optional[str] = None


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    assignment_id: int
    student_id: int
    student_name: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: datetime
    score: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None


class GradeSubmission(BaseModel):
    score: float
    feedback: Optional[str] = None


# ---- Quizzes ----

class QuestionCreate(BaseModel):
    text: str
    options: List[str] = Field(min_length=2, max_length=8)
    correct_index: int
    marks: float = 1
    topic_tag: Optional[str] = None


class QuestionForStudent(BaseModel):
    """Question shape shown to students taking a quiz — no answer key."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    options: List[str]
    marks: float


class QuestionForTeacher(QuestionForStudent):
    correct_index: int
    topic_tag: Optional[str] = None


class QuizCreate(BaseModel):
    course_id: int
    title: str = Field(min_length=2, max_length=200)
    duration_minutes: int = 15
    questions: List[QuestionCreate] = Field(min_length=1)


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    course_title: Optional[str] = None
    title: str
    duration_minutes: int
    question_count: int = 0
    total_marks: float = 0
    created_at: datetime
    best_score: Optional[float] = None
    attempt_count: int = 0


class QuizForAttempt(BaseModel):
    id: int
    title: str
    duration_minutes: int
    questions: List[QuestionForStudent]


class QuizForEdit(BaseModel):
    id: int
    title: str
    duration_minutes: int
    questions: List[QuestionForTeacher]


class StartAttemptResponse(BaseModel):
    attempt_id: int
    quiz: QuizForAttempt
    started_at: datetime
    resumed: bool = False
    seconds_left: int


class SubmitAttempt(BaseModel):
    answers: Dict[int, int]  # question_id -> chosen_index


class AttemptResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    quiz_id: int
    quiz_title: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    score: float
    total_marks: float
    started_at: datetime
    submitted_at: Optional[datetime] = None


# ---- Question papers ----

class QuestionPaperCreate(BaseModel):
    title: str
    subject: str
    year: Optional[int] = None
    file_url: str


class QuestionPaperOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    subject: str
    year: Optional[int] = None
    file_url: str
    uploaded_by: int
    created_at: datetime
    is_bookmarked: bool = False
