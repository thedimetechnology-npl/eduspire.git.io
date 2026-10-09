from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CheckoutRequest(BaseModel):
    course_id: Optional[int] = None
    plan_id: Optional[int] = None
    card_last4: Optional[str] = "4242"


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    amount: float
    method: str
    status: str
    transaction_id: Optional[str] = None
    created_at: datetime
    invoice_number: Optional[str] = None


class SubscriptionPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    price: float
    duration_days: int
    features: Optional[str] = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan: SubscriptionPlanOut
    start_date: datetime
    end_date: datetime
    status: str
