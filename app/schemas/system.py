from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    ip_address: Optional[str] = None
    created_at: datetime


class SettingsPublic(BaseModel):
    site_name: str = "EduSphere Pro"
    support_email: str = "support@edusphere.pro"
    theme_color: str = "#C9974A"
    allow_registrations: bool = True


class SettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    support_email: Optional[str] = None
    theme_color: Optional[str] = None
    allow_registrations: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None


class ChartPoint(BaseModel):
    label: str
    value: float


class StudentDashboard(BaseModel):
    enrolled_courses: int
    completed_courses: int
    pending_assignments: int
    upcoming_live_classes: int
    certificates_earned: int
    average_quiz_score: float
    overall_progress: float
    progress_by_course: List[ChartPoint]
    recent_notifications: list


class TeacherDashboard(BaseModel):
    total_courses: int
    published_courses: int
    total_students: int
    pending_submissions: int
    upcoming_live_classes: int
    average_rating: float
    earnings_total: float
    students_per_course: List[ChartPoint]
    # New sections
    today_schedule: List[dict] = []
    student_performance: List[ChartPoint] = []
    recent_assignments: List[dict] = []
    upcoming_classes: List[dict] = []
    recent_activity: List[dict] = []


class AdminDashboard(BaseModel):
    total_students: int
    total_teachers: int
    total_courses: int
    published_courses: int
    total_enrollments: int
    total_revenue: float
    revenue_by_month: List[ChartPoint]
    signups_by_month: List[ChartPoint]
    top_courses: List[ChartPoint]


class BIOverview(BaseModel):
    dau: int
    mau: int
    course_completion_rate: float
    total_revenue: float
    top_courses: List[ChartPoint]
    top_teachers: List[ChartPoint]
    student_growth: List[ChartPoint]
    engagement_by_day: List[ChartPoint]


class PerformanceReportRow(BaseModel):
    student_id: int
    student_name: str
    courses_enrolled: int
    courses_completed: int
    average_quiz_score: float
    attendance_percentage: float


class CourseAnalyticsRow(BaseModel):
    course_id: int
    title: str
    enrolled_count: int
    completion_rate: float
    average_rating: float
    revenue: float


class WeakTopic(BaseModel):
    topic: str
    accuracy_percent: float
    questions_attempted: int


class RecommendationOut(BaseModel):
    course_id: int
    title: str
    reason: str


class StudyPlanItem(BaseModel):
    title: str
    type: str
    due_date: Optional[datetime] = None
    course_title: Optional[str] = None
    priority: str = "normal"


class AIAssistantRequest(BaseModel):
    question: str


class AIAssistantResponse(BaseModel):
    answer: str
    source: str  # "rule_based" or "claude"
