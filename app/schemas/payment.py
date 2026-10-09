from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Create Payment Order
# ==========================================================

class CreatePaymentRequest(BaseModel):
    """Request to create a Cashfree payment order."""

    subscription_id: Optional[int] = None
    course_id: Optional[int] = None


class CreatePaymentResponse(BaseModel):
    """Response returned after creating a Cashfree order."""

    payment_id: int
    order_id: str
    payment_session_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: str


# ==========================================================
# Verify Payment
# ==========================================================

class VerifyPaymentRequest(BaseModel):
    """Verify payment using Cashfree order id."""

    order_id: str


# ==========================================================
# Payment Details
# ==========================================================

class PaymentResponse(BaseModel):
    """Payment details."""

    model_config = ConfigDict(from_attributes=True)

    id: int

    student_id: int

    subscription_id: Optional[int] = None
    course_id: Optional[int] = None

    amount: Decimal

    gateway: str
    method: str

    status: str

    transaction_id: Optional[str] = None
    cashfree_order_id: Optional[str] = None
    payment_session_id: Optional[str] = None

    order_currency: str

    payment_message: Optional[str] = None

    created_at: datetime


# ==========================================================
# Payment History
# ==========================================================

class PaymentHistoryResponse(BaseModel):
    """Payment history item."""

    model_config = ConfigDict(from_attributes=True)

    id: int

    amount: Decimal
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    invoice_number: Optional[str] = None

    status: str

    gateway: str

    transaction_id: Optional[str] = None

    created_at: datetime


# ==========================================================
# Invoice
# ==========================================================

class InvoiceResponse(BaseModel):
    """Invoice details."""

    model_config = ConfigDict(from_attributes=True)

    id: int

    payment_id: int

    invoice_number: str

    issued_at: datetime
