from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.academic import Course, CourseStatus, Enrollment
from app.models.commerce import Subscription, SubscriptionPlan
from app.models.user import User
from app.schemas.commerce import SubscriptionOut, SubscriptionPlanOut

router = APIRouter()


@router.get("/subscription-plans", response_model=list[SubscriptionPlanOut])
def list_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).all()


@router.post("/subscription-plans", response_model=SubscriptionPlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(payload: SubscriptionPlanOut, admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    plan = SubscriptionPlan(name=payload.name, price=payload.price, duration_days=payload.duration_days, features=payload.features)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/subscriptions/my", response_model=list[SubscriptionOut])
def my_subscriptions(student: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    subs = db.query(Subscription).filter(Subscription.student_id == student.id).all()
    return [SubscriptionOut(id=s.id, plan=s.plan, start_date=s.start_date, end_date=s.end_date, status=s.status) for s in subs]
