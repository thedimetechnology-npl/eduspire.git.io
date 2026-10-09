import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email_async(to: str, subject: str, body: str):
    """Send email using aiosmtplib"""
    message = MIMEMultipart()
    message["From"] = settings.MAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    try:
        async with aiosmtplib.SMTP(
            hostname=settings.MAIL_SERVER,
            port=settings.MAIL_PORT,
            username=settings.MAIL_USERNAME or None,
            password=settings.MAIL_PASSWORD or None,
            use_tls=settings.MAIL_SSL_TLS,
            start_tls=settings.MAIL_STARTTLS if not settings.MAIL_SSL_TLS else False,
            timeout=20,
        ) as smtp:
            await smtp.send_message(message)

        logger.info("Email sent to %s with subject %s", to, subject)
        return True

    except Exception:
        logger.exception(
            "Failed to send email to %s with subject %s",
            to,
            subject,
        )
        return False


def send_email(to: str, subject: str, body: str):
    """Wrapper to send email synchronously"""
    try:
        loop = asyncio.get_event_loop()

        if loop.is_running():
            # If loop is already running, schedule it
            return asyncio.create_task(
                send_email_async(to, subject, body)
            )
        else:
            # Otherwise run it
            return loop.run_until_complete(
                send_email_async(to, subject, body)
            )

    except RuntimeError:
        # Fallback: create new loop
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)

        result = new_loop.run_until_complete(
            send_email_async(to, subject, body)
        )

        new_loop.close()
        return result


def send_verification_email(to: str, name: str, token: str):
    """Send 6-digit email verification OTP"""

    body = f"""
Hi {name},

Welcome to EduSphere Pro!

Your email verification OTP is:

{token}

Enter this OTP in EduSphere Pro to verify your email address.

This OTP expires in 24 hours.

If you did not create an EduSphere Pro account, you can safely ignore this email.

Regards,
EduSphere Pro Team
"""

    send_email(
        to,
        "Your EduSphere Pro verification OTP",
        body,
    )


def send_password_reset_email(to: str, name: str, token: str):
    link = f"{settings.FRONTEND_URL}/reset-password/{token}"

    body = f"""
Hi {name},

We received a request to reset your password.

Click below:

{link}

This link expires in 1 hour.

If you didn't request this, simply ignore this email.
"""

    send_email(
        to,
        "Reset your EduSphere Pro password",
        body,
    )