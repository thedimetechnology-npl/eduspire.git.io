from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey(
        "subscriptions.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(30), default="cashfree")
    # success, pending, failed, refunded
    status = Column(
        SQLEnum(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    transaction_id = Column(String(100), unique=True, nullable=True)
    cashfree_order_id = Column(String(100), unique=True, nullable=True)
    payment_session_id = Column(String(255), nullable=True)
    order_currency = Column(String(10), default="INR")
    gateway = Column(String(30), default="cashfree")
    payment_message = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User")
    course = relationship("Course")
    invoice = relationship("Invoice", back_populates="payment",
                           uselist=False, cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    payment = relationship("Payment", back_populates="invoice")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    duration_days = Column(Integer, nullable=False)
    features = Column(Text, nullable=True)  # comma separated for simplicity


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey(
        "subscription_plans.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="active")

    student = relationship("User")
    plan = relationship("SubscriptionPlan")
