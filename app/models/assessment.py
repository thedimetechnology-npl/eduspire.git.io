from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    max_score = Column(Float, default=100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course")
    submissions = relationship(
        "AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan"
    )


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    duration_minutes = Column(Integer, default=15)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # ["opt A", "opt B", "opt C", "opt D"]
    correct_index = Column(Integer, nullable=False)
    marks = Column(Float, default=1)
    topic_tag = Column(String(100), nullable=True, index=True)

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answers = Column(JSON, default=dict)  # {"<question_id>": chosen_index}
    score = Column(Float, default=0)
    total_marks = Column(Float, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("User")


class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=True)
    file_url = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QuestionPaperBookmark(Base):
    __tablename__ = "question_paper_bookmarks"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_paper_id = Column(Integer, ForeignKey("question_papers.id"), nullable=False)
