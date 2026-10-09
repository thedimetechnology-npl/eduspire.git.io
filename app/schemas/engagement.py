from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---- Live classes / calendar ----

class LiveClassCreate(BaseModel):
    course_id: int
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 60
    meeting_link: Optional[str] = None


class LiveClassUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None
    recording_link: Optional[str] = None


class LiveClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    course_title: Optional[str] = None
    teacher_id: int
    teacher_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    meeting_link: Optional[str] = None
    recording_link: Optional[str] = None


class CalendarEvent(BaseModel):
    type: str  # live_class, assignment_due, quiz
    title: str
    course_title: Optional[str] = None
    date: datetime
    ref_id: int
    meeting_link: Optional[str] = None


# ---- Attendance ----

class AttendanceMark(BaseModel):
    student_id: int
    course_id: int
    live_class_id: Optional[int] = None
    status: str = "present"


class BulkAttendanceMark(BaseModel):
    course_id: int
    live_class_id: int
    records: list[AttendanceMark]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_id: int
    course_title: Optional[str] = None
    live_class_id: Optional[int] = None
    date: datetime
    status: str


class AttendanceSummary(BaseModel):
    course_id: int
    course_title: str
    total_sessions: int
    present_count: int
    late_count: int
    absent_count: int
    percentage: float


# ---- Certificates ----

class CertificateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_id: int
    course_title: Optional[str] = None
    certificate_number: str
    file_url: Optional[str] = None
    issued_at: datetime


class CertificateVerify(BaseModel):
    valid: bool
    student_name: Optional[str] = None
    course_title: Optional[str] = None
    issued_at: Optional[datetime] = None
    certificate_number: Optional[str] = None


# ---- Notifications ----

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    title: str
    message: Optional[str] = None
    is_read: bool
    created_at: datetime


# ---- Messaging ----

class ConversationStart(BaseModel):
    other_user_id: int


class ConversationOut(BaseModel):
    id: int
    other_user_id: int
    other_user_name: str
    other_user_role: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class MessageCreate(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    conversation_id: int
    sender_id: int
    sender_name: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    sent_at: datetime


# ---- Reviews ----

class ReviewCreate(BaseModel):
    course_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
