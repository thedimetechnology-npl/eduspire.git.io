import enum

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CourseStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class CourseLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    courses = relationship("Course", back_populates="category")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    price = Column(Numeric(10, 2), default=0)
    level = Column(Enum(CourseLevel), default=CourseLevel.beginner)
    status = Column(Enum(CourseStatus), default=CourseStatus.draft, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="courses")
    teacher = relationship("User", foreign_keys=[teacher_id])
    lessons = relationship(
        "Lesson", back_populates="course", cascade="all, delete-orphan", order_by="Lesson.order_index"
    )
    enrollments = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_enrollment_student_course"),
    )

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    # active, completed, cancelled
    status = Column(String(20), default="active")
    progress_percent = Column(Float, default=0)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course", back_populates="enrollments")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    lesson_type = Column(String(20), default="video")  # video, pdf, ppt
    content_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, default=0)
    order_index = Column(Integer, default=0)

    course = relationship("Course", back_populates="lessons")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_lesson_progress_student_lesson"),
    )

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    position_seconds = Column(Float, default=0)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())
