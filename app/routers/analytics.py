from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User
from app.schemas.system import (
    AdminDashboard, AIAssistantRequest, AIAssistantResponse, BIOverview, CourseAnalyticsRow,
    PerformanceReportRow, RecommendationOut, StudentDashboard, StudyPlanItem, TeacherDashboard, WeakTopic,
)
from app.services import analytics_service, recommendation_service

router = APIRouter()


@router.get("/dashboard/student", response_model=StudentDashboard)
def student_dashboard(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return analytics_service.student_dashboard(db, student.id)


@router.get("/dashboard/teacher", response_model=TeacherDashboard)
def teacher_dashboard(teacher: User = Depends(require_role("teacher")), db: Session = Depends(get_db)):
    return analytics_service.teacher_dashboard(db, teacher.id)


@router.get("/dashboard/admin", response_model=AdminDashboard)
def admin_dashboard(admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return analytics_service.admin_dashboard(db)


@router.get("/bi/overview", response_model=BIOverview)
def bi_overview(admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return analytics_service.bi_overview(db)


@router.get("/reports/student-performance", response_model=list[PerformanceReportRow])
def student_performance_report(admin: User = Depends(require_role("admin", "teacher")), db: Session = Depends(get_db)):
    return analytics_service.performance_report(db)


@router.get("/reports/course-analytics", response_model=list[CourseAnalyticsRow])
def course_analytics(admin: User = Depends(require_role("admin", "teacher")), db: Session = Depends(get_db)):
    return analytics_service.course_analytics_report(db)


@router.get("/reports/attendance")
def attendance_report(admin: User = Depends(require_role("admin", "teacher")), db: Session = Depends(get_db)):
    return analytics_service.attendance_report(db)


@router.get("/reports/revenue")
def revenue_report(admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return analytics_service.revenue_report(db)


@router.get("/ai/recommendations", response_model=list[RecommendationOut])
def get_recommendations(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return recommendation_service.recommend_courses(db, student.id)


@router.get("/ai/weak-topics", response_model=list[WeakTopic])
def get_weak_topics(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return recommendation_service.detect_weak_topics(db, student.id)


@router.get("/ai/study-planner", response_model=list[StudyPlanItem])
def get_study_planner(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    return recommendation_service.build_study_planner(db, student.id)


@router.post("/ai/assistant", response_model=AIAssistantResponse)
def ask_assistant(payload: AIAssistantRequest, user: User = Depends(require_role("student", "teacher", "admin"))):
    answer, source = recommendation_service.ai_faq_answer(payload.question)
    return AIAssistantResponse(answer=answer, source=source)
