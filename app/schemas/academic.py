from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.academic import CourseLevel, CourseStatus
from app.schemas.user import UserOut


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    course_count: int = 0


class LessonCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    lesson_type: str = "video"
    content_url: Optional[str] = None
    duration_minutes: int = 0
    order_index: int = 0


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    title: str
    lesson_type: str
    content_url: Optional[str] = None
    duration_minutes: int
    order_index: int
    is_completed: bool = False
    position_seconds: float = 0


class CourseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category_id: Optional[int] = None
    price: float = 0
    level: CourseLevel = CourseLevel.beginner


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    level: Optional[CourseLevel] = None


class CourseCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: float
    level: CourseLevel
    status: CourseStatus
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    teacher_id: int
    teacher_name: Optional[str] = None
    rating_avg: float = 0
    rating_count: int = 0
    enrolled_count: int = 0
    lesson_count: int = 0
    created_at: datetime


class CourseDetail(CourseCard):
    lessons: list[LessonOut] = []
    is_enrolled: bool = False
    my_progress: float = 0


class EnrollRequest(BaseModel):
    course_id: int


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course: CourseCard
    status: str
    progress_percent: float
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    student_id: Optional[int] = None
    student_name: Optional[str] = None


class LessonProgressUpdate(BaseModel):
    is_completed: bool = True
    position_seconds: float = Field(default=0, ge=0)
