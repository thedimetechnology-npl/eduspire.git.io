"""
Payment Router

Endpoints:
- Create Payment
- Get Payment
- Payment History
- Verify Payment
- Cancel Payment
- Cashfree Webhook
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.models.academic import Course
from app.models.commerce import Invoice
from app.schemas.payment import (
    CreatePaymentRequest,
    CreatePaymentResponse,
    PaymentHistoryResponse,
    PaymentResponse,
    VerifyPaymentRequest,
)
from app.services.cashfree_client import cashfree_client
from app.services.payment_service import payment_service

router = APIRouter()


# ==========================================================
# Create Payment
# ==========================================================

@router.post(
    "/create",
    response_model=CreatePaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payload: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("payment-create", 10, 900)),
):
    try:
        return payment_service.create_payment(
            db=db,
            user=current_user,
            subscription_id=payload.subscription_id,
            course_id=payload.course_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# ==========================================================
# Payment History
# ==========================================================

@router.get(
    "/history",
    response_model=list[PaymentHistoryResponse],
)
def payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    return payment_service.get_payment_history(
        db=db,
        student_id=current_user.id,
    )


@router.get("/admin-history", response_model=list[PaymentHistoryResponse])
def admin_payment_history(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    payments = payment_service.get_admin_payment_history(db)
    result = []
    for payment in payments:
        course = db.query(Course).filter(Course.id == payment.course_id).first() if payment.course_id else None
        invoice = db.query(Invoice).filter(Invoice.payment_id == payment.id).first()
        result.append({
            "id": payment.id,
            "amount": payment.amount,
            "status": payment.status,
            "gateway": payment.gateway,
            "transaction_id": payment.transaction_id,
            "created_at": payment.created_at,
            "course_id": payment.course_id,
            "course_title": course.title if course else None,
            "invoice_number": invoice.invoice_number if invoice else None,
        })
    return result


# ==========================================================
# Verify Payment
# ==========================================================

@router.post("/verify")
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("payment-verify", 20, 300)),
):

    try:
        payment = payment_service.get_payment_by_order_id(
            db=db,
            order_id=payload.order_id,
        )

        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found.",
            )

        if payment.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized.",
            )

        result = payment_service.verify_payment(
            db=db,
            order_id=payload.order_id,
        )

        if result.get("status") == "PENDING":
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content=result,
            )

        if result.get("status") in ("FAILED", "CANCELLED"):
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content=result,
            )

        return result

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify payment. Please try again.",
        )


# ==========================================================
# Cashfree Webhook
# ==========================================================

@router.post("/webhook")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
):

    try:
        signature = request.headers.get("x-webhook-signature")
        timestamp = request.headers.get("x-webhook-timestamp")
        body = await request.body()

        if not signature or not timestamp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing webhook signature",
            )

        if not cashfree_client.verify_webhook_signature(
            signature=signature,
            timestamp=timestamp,
            body=body.decode("utf-8"),
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

        payload = await request.json()

        payment = payment_service.handle_webhook(
            db=db,
            payload=payload,
        )

        return {
            "success": True,
            "message": "Webhook processed successfully.",
            "payment_id": payment.id,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# ==========================================================
# Get Payment
# ==========================================================

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    payment = payment_service.get_payment(
        db=db,
        payment_id=payment_id,
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found.",
        )

    if payment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized.",
        )

    return payment


# ==========================================================
# Cancel Payment
# ==========================================================

@router.post("/{payment_id}/cancel")
def cancel_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    payment = payment_service.get_payment(
        db=db,
        payment_id=payment_id,
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found.",
        )

    if payment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized.",
        )

    try:
        return payment_service.cancel_payment(
            db=db,
            payment_id=payment_id,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


