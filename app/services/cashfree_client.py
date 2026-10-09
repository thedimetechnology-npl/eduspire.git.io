"""
Cashfree Payment Gateway Client

This module is responsible only for communicating with the
Cashfree Payment Gateway APIs.

Responsibilities:
- Initialize Cashfree SDK
- Create payment orders
- Fetch order details
- Fetch payment details
- Verify webhook signature

Business logic (database updates, subscription activation, etc.)
must NOT be implemented here.
"""

from decimal import Decimal
from typing import Any
from cashfree_pg.models.order_meta import OrderMeta

from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails

from app.core.config import settings


class CashfreeClient:
    """Wrapper around the Cashfree Payment Gateway SDK."""

    def __init__(self) -> None:
        """Initialize Cashfree SDK configuration."""

        env = str(settings.CASHFREE_ENV).upper()

        if env == "PRODUCTION":
            environment = Cashfree.PRODUCTION
        else:
            environment = Cashfree.SANDBOX

        self.client = Cashfree(
            XEnvironment=environment,
            XClientId=settings.CASHFREE_CLIENT_ID,
            XClientSecret=settings.CASHFREE_CLIENT_SECRET,
        )

    # ------------------------------------------------------------------
    # Create Order
    # ------------------------------------------------------------------

    def create_order(
        self,
        *,
        order_id: str,
        amount: Decimal,
        currency: str,
        customer_id: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
    ) -> Any:
        """
        Create a payment order in Cashfree.
        """

        customer = CustomerDetails(
            customer_id=customer_id,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )

        order_meta = OrderMeta(
            return_url=(
                f"{settings.FRONTEND_URL.rstrip('/')}"
                "/payment-success?order_id={order_id}"
            )
        )

        request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(amount),
            order_currency=currency,
            customer_details=customer,
            order_meta=order_meta,
        )

        try:
            response = self.client.PGCreateOrder(request)
            return response.data

        except Exception as exc:
            raise RuntimeError(
                f"Failed to create Cashfree order: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Fetch Order
    # ------------------------------------------------------------------

    def get_order(self, order_id: str) -> Any:
        """
        Fetch order details from Cashfree.
        """

        try:
            response = self.client.PGFetchOrder(order_id)
            return response.data

        except Exception as exc:
            raise RuntimeError(
                f"Failed to fetch Cashfree order: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Fetch Payments
    # ------------------------------------------------------------------

    def get_payments(self, order_id: str) -> Any:
        """
        Fetch all payments for an order.
        """

        try:
            response = self.client.PGOrderFetchPayments(order_id)
            return response.data

        except Exception as exc:
            raise RuntimeError(
                f"Failed to fetch payment details: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Fetch Single Payment
    # ------------------------------------------------------------------

    def get_payment(self, order_id: str, payment_id: str) -> Any:
        """
        Fetch a specific payment.
        """

        try:
            response = self.client.PGOrderFetchPayment(
                order_id,
                payment_id,
            )
            return response.data

        except Exception as exc:
            raise RuntimeError(
                f"Failed to fetch payment: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Verify Webhook Signature
    # ------------------------------------------------------------------

    def verify_webhook_signature(
        self,
        signature: str,
        timestamp: str,
        body: str,
    ) -> bool:
        """
        Verify Cashfree webhook signature.
        """

        try:
            self.client.PGVerifyWebhookSignature(
                signature,
                body,
                timestamp,
            )
            return True

        except Exception:
            return False


cashfree_client = CashfreeClient()
