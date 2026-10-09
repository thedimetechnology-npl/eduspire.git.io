import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def _create_token(payload: dict, expires_delta: timedelta, token_type: str) -> str:
    to_encode = payload.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({"exp": now + expires_delta, "iat": now, "type": token_type})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: int, role: str, token_version: int = 0) -> str:
    return _create_token(
        {"sub": str(user_id), "role": role, "tv": token_version},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(user_id: int, token_version: int = 0) -> str:
    return _create_token(
        {"sub": str(user_id), "tv": token_version},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def create_media_token(user_id: int, lesson_id: int) -> str:
    return _create_token(
        {"sub": str(user_id), "lesson_id": lesson_id},
        timedelta(minutes=10),
        "media",
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_random_token() -> str:
    return secrets.token_urlsafe(32)


def generate_certificate_number() -> str:
    return f"ESP-{secrets.token_hex(4).upper()}-{secrets.randbelow(9000) + 1000}"


def generate_transaction_id() -> str:
    return f"TXN{secrets.token_hex(8).upper()}"


def generate_invoice_number() -> str:
    return f"INV-{secrets.token_hex(5).upper()}"
