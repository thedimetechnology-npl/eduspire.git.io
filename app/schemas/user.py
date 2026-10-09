from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import RoleEnum


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    role: RoleEnum = RoleEnum.student


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: RoleEnum
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    avatar_url: Optional[str] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=72)


class ResendVerificationRequest(BaseModel):
    email: EmailStr
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None


class StudentProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None


class TeacherProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    subjects: List[str] = []
    experience_years: int = 0
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    availability: Dict = {}


class TeacherProfileUpdate(BaseModel):
    subjects: Optional[List[str]] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=9999)
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    availability: Optional[Dict] = None


class UserDetailOut(UserOut):
    student_profile: Optional[StudentProfileOut] = None
    teacher_profile: Optional[TeacherProfileOut] = None
