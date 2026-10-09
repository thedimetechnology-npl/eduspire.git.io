import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False,
                  default=RoleEnum.student, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(30), nullable=True)
    token_version = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student_profile = relationship(
        "StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher_profile = relationship(
        "TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"),
                     unique=True, nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)

    user = relationship("User", back_populates="student_profile")


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"),
                     unique=True, nullable=False)
    subjects = Column(JSON, default=list)
    experience_years = Column(Integer, default=0)
    qualifications = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    # e.g. {"mon": ["09:00-11:00"], "wed": [...]}
    availability = Column(JSON, default=dict)

    user = relationship("User", back_populates="teacher_profile")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
