
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4
from typing import Optional
from app.models.academic import Course, Enrollment

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.services.cashfree_client import cashfree_client
from app.models.commerce import (
    Invoice,
    Payment,
    PaymentStatus,
    Subscription,
    SubscriptionPlan,
)
from app.models.user import User


class PaymentService:
    """Business logic for payments."""

    # ==========================================================
    # Helpers
    # ==========================================================

    @staticmethod
    def generate_order_id() -> str:
        """
        Generate a unique Cashfree order id.
        Example:
        EDU-3A8C4D7E1F924A7B
        """
        return f"EDU-{uuid4().hex[:16].upper()}"

    @staticmethod
    def generate_invoice_number() -> str:
        """
        Generate invoice number.
        Example:
        INV-6D9B0A12EF45
        """
        return f"INV-{uuid4().hex[:12].upper()}"

    # ==========================================================
    # Create Payment
    # ==========================================================

    @staticmethod
    def create_payment(
        db: Session,
        *,
        user: User,
        subscription_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ):
        """
        Create payment record and Cashfree order.
        """

        if (subscription_id is None) == (course_id is None):
            raise ValueError("Provide exactly one course or subscription")

        currency = "INR"
        if course_id is not None:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course is None or course.status.value != "published":
                raise ValueError("Course is not available for purchase")
            if db.query(Enrollment).filter(
                Enrollment.student_id == user.id,
                Enrollment.course_id == course.id,
            ).first():
                raise ValueError("You are already enrolled in this course")
            amount = Decimal(course.price)
        else:
            subscription = db.query(Subscription).filter(
                Subscription.id == subscription_id,
                Subscription.student_id == user.id,
            ).first()
            if subscription is None:
                raise ValueError("Subscription not found")
            plan = db.query(SubscriptionPlan).filter(
                SubscriptionPlan.id == subscription.plan_id,
            ).first()
            if plan is None:
                raise ValueError("Subscription plan not found")
            amount = Decimal(plan.price)

        order_id = PaymentService.generate_order_id()

        try:
            # ---------------------------------------------
            # Create Cashfree Order
            # ---------------------------------------------

            response = cashfree_client.create_order(
                order_id=order_id,
                amount=amount,
                currency=currency,
                customer_id=f"USR{user.id}",
                customer_name=user.full_name,
                customer_email=user.email,
                customer_phone=user.phone or "9999999999",
            )

            # ---------------------------------------------
            # Read SDK Response
            # ---------------------------------------------

            payment_session_id = getattr(
                response,
                "payment_session_id",
                None,
            )

            cashfree_order_id = getattr(
                response,
                "order_id",
                order_id,
            )

            # ---------------------------------------------
            # Create Database Record
            # ---------------------------------------------

            payment = Payment(
                student_id=user.id,
                subscription_id=subscription_id,
                course_id=course_id,
                amount=amount,
                gateway="cashfree",
                method="cashfree",
                status=PaymentStatus.PENDING,
                transaction_id=None,
                cashfree_order_id=cashfree_order_id,
                payment_session_id=payment_session_id,
                order_currency="INR",
                payment_message="Order created successfully",
            )

            db.add(payment)
            db.commit()
            db.refresh(payment)

            return {
                "payment_id": payment.id,
                "order_id": cashfree_order_id,
                "payment_session_id": payment_session_id,
                "amount": payment.amount,
                "currency": payment.order_currency,
                "status": payment.status,
            }

        except SQLAlchemyError:
            db.rollback()
            raise

        except Exception as exc:
            db.rollback()
            raise RuntimeError(
                f"Unable to create payment: {exc}"
            ) from exc

    # ==========================================================
    # Get Payment
    # ==========================================================

    @staticmethod
    def get_payment(
        db: Session,
        payment_id: int,
    ) -> Optional[Payment]:

        return (
            db.query(Payment)
            .filter(Payment.id == payment_id)
            .first()
        )

    # ==========================================================
    # Payment History
    # ==========================================================

    @staticmethod
    def get_payment_history(
        db: Session,
        student_id: int,
    ):

        return (
            db.query(Payment)
            .filter(Payment.student_id == student_id)
            .order_by(Payment.created_at.desc())
            .all()
        )

    @staticmethod
    def get_admin_payment_history(db: Session):
        return db.query(Payment).order_by(Payment.created_at.desc()).all()

  # ==========================================================
  # Verify Payment
  # ==========================================================

    @staticmethod
    def verify_payment(
        db: Session,
        order_id: str,
    ):
        """
        Verify payment status from Cashfree.
        """

        payment = (
            db.query(Payment)
            .filter(Payment.cashfree_order_id == order_id)
            .first()
        )

        if payment is None:
            raise ValueError("Payment not found.")

        order = cashfree_client.get_order(order_id)
        payments = cashfree_client.get_payments(order_id)

        order_amount = getattr(order, "order_amount", None)
        if order_amount is not None and Decimal(str(order_amount)) != payment.amount:
            raise ValueError("Payment amount does not match the order")

        if not payments:
            return {
                "success": False,
                "status": "PENDING",
                "message": "Payment not completed yet."
            }

        latest_payment = payments[0]

        payment_status = getattr(
            latest_payment,
            "payment_status",
            "PENDING",
        )

        transaction_id = getattr(
            latest_payment,
            "cf_payment_id",
            None,
        )

        payment_message = getattr(
            latest_payment,
            "payment_message",
            None,
        )

        if payment_status.upper() == "SUCCESS":

            PaymentService.mark_payment_success(
                db=db,
                payment=payment,
                transaction_id=transaction_id,
                payment_message=payment_message,
            )

        elif payment_status.upper() == "FAILED":

            PaymentService.mark_payment_failed(
                db=db,
                payment=payment,
                payment_message=payment_message,
            )
        elif payment_status.upper() not in {"PENDING", "AUTHORIZED"}:
            raise ValueError("Unsupported payment status")

        is_success = payment.status.value == "SUCCESS"

        return {
            "success": is_success,
            "status": payment.status.value,
            "payment_id": payment.id,
            "course_id": payment.course_id,
            "transaction_id": payment.transaction_id,
        }

    # ==========================================================
    # Mark Payment Success
    # ==========================================================

    @staticmethod
    def mark_payment_success(
        db: Session,
        *,
        payment: Payment,
        transaction_id: Optional[str],
        payment_message: Optional[str],
    ):

        if payment.status == PaymentStatus.SUCCESS:
            return payment

        payment.status = PaymentStatus.SUCCESS
        payment.transaction_id = transaction_id
        payment.payment_message = payment_message

        db.commit()
        db.refresh(payment)

        # ---------------------------------------------------------
        # Enroll student into the paid course
        # ---------------------------------------------------------
        if payment.course_id:

            existing = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == payment.student_id,
                    Enrollment.course_id == payment.course_id,
                )
                .first()
            )

            if not existing:
                enrollment = Enrollment(
                    student_id=payment.student_id,
                    course_id=payment.course_id,
                )

                db.add(enrollment)
                db.commit()

        # ---------------------------------------------------------
        # Create Invoice
        # ---------------------------------------------------------
        PaymentService.create_invoice(
            db=db,
            payment=payment,
        )

        # ---------------------------------------------------------
        # Activate Subscription
        # ---------------------------------------------------------
        if payment.subscription_id:

            PaymentService.activate_subscription(
                db=db,
                subscription_id=payment.subscription_id,
                student_id=payment.student_id,
            )

        return payment
    # ==========================================================
    # Mark Payment Failed
    # ==========================================================

    @staticmethod
    def mark_payment_failed(
        db: Session,
        *,
        payment: Payment,
        payment_message: Optional[str],
    ):

        if payment.status in {
            PaymentStatus.SUCCESS,
            PaymentStatus.CANCELLED,
            PaymentStatus.REFUNDED,
        }:
            return payment

        payment.status = PaymentStatus.FAILED
        payment.payment_message = payment_message

        db.commit()
        db.refresh(payment)

        return payment

    # ==========================================================
    # Activate Subscription
    # ==========================================================

    @staticmethod
    def activate_subscription(
        db: Session,
        subscription_id: int,
        student_id: int,
    ):

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.id == subscription_id,
                Subscription.student_id == student_id,
            )
            .first()
        )

        if subscription is None:
            return None

        plan = (
            db.query(SubscriptionPlan)
            .filter(
                SubscriptionPlan.id == subscription.plan_id
            )
            .first()
        )

        if plan is None:
            return None

        start_date = datetime.utcnow()

        subscription.start_date = start_date
        subscription.end_date = (
            start_date +
            timedelta(days=plan.duration_days)
        )

        subscription.status = "active"

        db.commit()
        db.refresh(subscription)

        return subscription

    # ==========================================================
    # Create Invoice
    # ==========================================================

    @staticmethod
    def create_invoice(
        db: Session,
        *,
        payment: Payment,
    ):

        existing = (
            db.query(Invoice)
            .filter(
                Invoice.payment_id == payment.id
            )
            .first()
        )

        if existing:
            return existing

        invoice = Invoice(
            payment_id=payment.id,
            invoice_number=PaymentService.generate_invoice_number(),
        )

        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        return invoice

    # ==========================================================
    # Get Payment by Cashfree Order ID
    # ==========================================================

    @staticmethod
    def get_payment_by_order_id(
        db: Session,
        order_id: str,
    ) -> Optional[Payment]:

        return (
            db.query(Payment)
            .filter(Payment.cashfree_order_id == order_id)
            .first()
        )

    # ==========================================================
    # Handle Cashfree Webhook
    # ==========================================================

    @staticmethod
    def handle_webhook(
        db: Session,
        payload: dict,
    ):
        """
        Handle Cashfree webhook payload.

        This method should be called from the webhook router
        after verifying the webhook signature.
        """

        data = payload.get("data", {})

        order = data.get("order", {})
        payment_data = data.get("payment", {})

        order_id = order.get("order_id")

        if not order_id:
            raise ValueError("Order ID not found in webhook payload.")

        payment = PaymentService.get_payment_by_order_id(
            db=db,
            order_id=order_id,
        )

        if payment is None:
            raise ValueError("Payment not found.")

        payment_status = (
            payment_data.get("payment_status")
            or payment_data.get("payment_status_text")
            or ""
        ).upper()

        transaction_id = payment_data.get("cf_payment_id")
        payment_message = payment_data.get("payment_message")

        if payment_status == "SUCCESS":

            PaymentService.mark_payment_success(
                db=db,
                payment=payment,
                transaction_id=transaction_id,
                payment_message=payment_message,
            )

        elif payment_status == "FAILED":

            PaymentService.mark_payment_failed(
                db=db,
                payment=payment,
                payment_message=payment_message,
            )

        return payment

    # ==========================================================
    # Cancel Payment
    # ==========================================================

    @staticmethod
    def cancel_payment(
        db: Session,
        payment_id: int,
    ):

        payment = PaymentService.get_payment(
            db=db,
            payment_id=payment_id,
        )

        if payment is None:
            raise ValueError("Payment not found.")

        if payment.status == PaymentStatus.SUCCESS:
            raise ValueError(
                "Completed payment cannot be cancelled."
            )

        payment.status = PaymentStatus.CANCELLED
        payment.payment_message = "Payment cancelled by user."

        db.commit()
        db.refresh(payment)

        return payment

    # ==========================================================
    # Refund Placeholder
    # ==========================================================

    @staticmethod
    def refund_payment(
        db: Session,
        payment_id: int,
    ):
        """
        Placeholder for future refund implementation.

        Cashfree refund API will be integrated here.
        """

        payment = PaymentService.get_payment(
            db=db,
            payment_id=payment_id,
        )

        if payment is None:
            raise ValueError("Payment not found.")

        if payment.status != PaymentStatus.SUCCESS:
            raise ValueError(
                "Only successful payments can be refunded."
            )

        return {
            "message": (
                "Refund functionality will be "
                "implemented using Cashfree Refund API."
            ),
            "payment_id": payment.id,
        }


payment_service = PaymentService()
