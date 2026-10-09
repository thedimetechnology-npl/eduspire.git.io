from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class LiveClass(Base):
    __tablename__ = "live_classes"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    meeting_link = Column(String(500), nullable=True)
    recording_link = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course")
    teacher = relationship("User")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "live_class_id", name="uq_attendance_student_live_class"),
    )

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    live_class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=True)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="present")  # present, absent, late

    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course")
    live_class = relationship("LiveClass")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    certificate_number = Column(String(50), unique=True, index=True, nullable=False)
    file_url = Column(String(500), nullable=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User")
    course = relationship("Course")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), default="general")
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    participant_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    participant_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User")
    course = relationship("Course")
