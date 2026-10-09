"""Seed default users for all roles. Run: python seed.py"""
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User, RoleEnum, StudentProfile, TeacherProfile

# Use SEED_PASSWORD env var; generate a random password if not set (production-safe)
_default_password = os.environ.get("SEED_PASSWORD", "")
if _default_password:
    DEFAULT_PASSWORD = _default_password
    _is_random = False
else:
    DEFAULT_PASSWORD = secrets.token_urlsafe(16)
    _is_random = True

USERS = [
    {
        "full_name": "DIME Admin",
        "email": "dime-edu@admin.com",
        "role": RoleEnum.admin,
    },
    {
        "full_name": "DIME Educator",
        "email": "dime-edu@educator.com",
        "role": RoleEnum.teacher,
    },
    {
        "full_name": "DIME Student",
        "email": "dime-edu@student.com",
        "role": RoleEnum.student,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        hashed = hash_password(DEFAULT_PASSWORD)
        created = 0
        for data in USERS:
            existing = db.query(User).filter(User.email == data["email"]).first()
            if existing:
                print(f"  [skip] {data['email']} already exists")
                continue

            user = User(
                full_name=data["full_name"],
                email=data["email"],
                hashed_password=hashed,
                role=data["role"],
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()

            if user.role == RoleEnum.student:
                db.add(StudentProfile(user_id=user.id))
            elif user.role == RoleEnum.teacher:
                db.add(TeacherProfile(user_id=user.id))

            created += 1
            print(f"  [created] {data['email']} ({data['role'].value})")

        db.commit()
        if created:
            if _is_random:
                print(f"\nSeed complete. Generated password (save this): {DEFAULT_PASSWORD}")
            else:
                print(f"\nSeed complete. Password: {DEFAULT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
