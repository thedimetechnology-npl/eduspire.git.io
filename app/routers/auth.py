from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.system import AuditLog
from app.models.user import (
    EmailVerificationToken,
    PasswordResetToken,
    StudentProfile,
    TeacherProfile,
    User,
    RoleEnum,
)
from app.schemas.user import (
    ForgotPasswordRequest,
    RefreshRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenPair,
    UserLogin,
    UserOut,
    VerifyEmailRequest,
    UserRegister,
)
from app.services.email_service import (
    send_password_reset_email,
    send_verification_email,
)

router = APIRouter()


# ============================================================
# OTP HELPERS
# ============================================================

def generate_verification_otp() -> str:
    """
    Generate a secure 6-digit verification OTP.
    """
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_otp(otp: str) -> str:
    """
    Hash OTP before storing it in the database.
    """
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=TokenPair,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("register", 5, 900)),
):
    if payload.role == RoleEnum.admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts must be created by an existing administrator",
        )

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )

    db.add(user)
    db.flush()

    if user.role == RoleEnum.student:
        db.add(StudentProfile(user_id=user.id))
    elif user.role == RoleEnum.teacher:
        db.add(TeacherProfile(user_id=user.id))

    # --------------------------------------------------------
    # Generate 6-digit OTP
    # --------------------------------------------------------

    otp = generate_verification_otp()
    otp_hash = hash_verification_otp(otp)

    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token=otp_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            used=False,
        )
    )

    db.commit()
    db.refresh(user)

    # --------------------------------------------------------
    # Send OTP email
    # --------------------------------------------------------

    send_verification_email(
        user.email,
        user.full_name,
        otp,
    )

    # --------------------------------------------------------
    # KEEP EXISTING TOKEN RESPONSE
    # --------------------------------------------------------

    access = create_access_token(
        user.id,
        user.role.value,
        user.token_version,
    )

    refresh = create_refresh_token(
        user.id,
        user.token_version,
    )

    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
    )


# ============================================================
# LOGOUT
# ============================================================

@router.post("/logout")
def logout(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bumps token_version, which immediately invalidates every
    outstanding access and refresh token for this user.
    """

    user.token_version += 1

    db.add(
        AuditLog(
            user_id=user.id,
            action="logout",
            entity_type="user",
            entity_id=user.id,
            ip_address=request.client.host
            if request and request.client
            else None,
        )
    )

    db.commit()

    return {
        "message": "Logged out. All active sessions for this account have been invalidated."
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/login", response_model=TokenPair)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("login", 10, 900)),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    if not user.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before signing in",
        )

    db.add(
        AuditLog(
            user_id=user.id,
            action="login",
            entity_type="user",
            entity_id=user.id,
            ip_address=request.client.host
            if request.client
            else None,
        )
    )

    db.commit()

    access = create_access_token(
        user.id,
        user.role.value,
        user.token_version,
    )

    refresh = create_refresh_token(
        user.id,
        user.token_version,
    )

    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

@router.post("/refresh", response_model=TokenPair)
def refresh_token(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        data = decode_token(payload.refresh_token)

        if data.get("type") != "refresh":
            raise ValueError

    except Exception:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.query(User).filter(
        User.id == int(data["sub"])
    ).first()

    if not user or not user.is_active or not user.is_verified:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if data.get("tv", 0) != user.token_version:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="This session has been signed out. Please log in again.",
        )

    access = create_access_token(
        user.id,
        user.role.value,
        user.token_version,
    )

    refresh = create_refresh_token(
        user.id,
        user.token_version,
    )

    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
    )


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("forgot-password", 5, 900)),
):
    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if user:
        token = secrets.token_urlsafe(32)

        db.add(
            PasswordResetToken(
                user_id=user.id,
                token=token,
                expires_at=datetime.now(timezone.utc)
                + timedelta(hours=1),
            )
        )

        db.commit()

        send_password_reset_email(
            user.email,
            user.full_name,
            token,
        )

    return {
        "message": "If that email is registered, a reset link has been sent."
    }


# ============================================================
# RESET PASSWORD
# ============================================================

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == payload.token
        )
        .first()
    )

    if (
        not record
        or record.used
        or record.expires_at.replace(tzinfo=timezone.utc)
        < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired",
        )

    user = db.query(User).filter(
        User.id == record.user_id
    ).first()

    user.hashed_password = hash_password(
        payload.new_password
    )

    user.token_version += 1

    record.used = True

    db.commit()

    return {
        "message": "Password updated. You can now log in."
    }


# ============================================================
# VERIFY EMAIL WITH OTP
# ============================================================

@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit("verify-email", 5, 900)),
):
    """
    Verify a user's email using a 6-digit OTP.
    """

    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    if user.is_verified:
        return {
            "message": "Email is already verified."
        }

    record = (
        db.query(EmailVerificationToken)
        .filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used == False,
        )
        .order_by(
            EmailVerificationToken.id.desc()
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found",
        )

    expires_at = record.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired",
        )

    otp_hash = hash_verification_otp(payload.otp)

    if not hmac.compare_digest(otp_hash, record.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    user.is_verified = True
    record.used = True

    db.commit()

    return {
        "message": "Email verified successfully."
    }

# ============================================================
# RESEND VERIFICATION OTP
# ============================================================

@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
    _: None = Depends(
        rate_limit("resend-verification", 5, 900)
    ),
):
    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if user and not user.is_verified:

        # Invalidate previous verification records
        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used == False,
        ).update(
            {"used": True},
            synchronize_session=False,
        )

        # Generate new OTP
        otp = generate_verification_otp()
        otp_hash = hash_verification_otp(otp)

        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token=otp_hash,
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=10),
                used=False,
            )
        )

        db.commit()

        send_verification_email(
            user.email,
            user.full_name,
            otp,
        )

    return {
        "message": "If that account needs verification, a new verification code has been sent."
    }