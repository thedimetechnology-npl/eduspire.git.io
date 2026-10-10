from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User, RoleEnum, StudentProfile, TeacherProfile
from app.routers import (
    academic, admin, analytics, assessment, auth, commerce, communication, engagement, payment, search, users,
)
from app.ws import chat as ws_chat

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.PRIVATE_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.APP_NAME, version="1.0.0",
              description="EduSphere Pro Learning Management System API")


@app.on_event("startup")
def auto_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        password = settings.SEED_PASSWORD or "Dime@edu2026"
        hashed = hash_password(password)
        default_users = [
            ("DIME Admin", "dime-edu@admin.com", RoleEnum.admin),
            ("DIME Educator", "dime-edu@educator.com", RoleEnum.teacher),
            ("DIME Student", "dime-edu@student.com", RoleEnum.student),
        ]
        for name, email, role in default_users:
            if not db.query(User).filter(User.email == email).first():
                user = User(
                    full_name=name, email=email, hashed_password=hashed,
                    role=role, is_active=True, is_verified=True,
                )
                db.add(user)
                db.flush()
                if role == RoleEnum.student:
                    db.add(StudentProfile(user_id=user.id))
                elif role == RoleEnum.teacher:
                    db.add(TeacherProfile(user_id=user.id))
        db.commit()
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(academic.router, prefix="/api", tags=["Academic"])
app.include_router(assessment.router, prefix="/api", tags=["Assessment"])
app.include_router(engagement.router, prefix="/api", tags=["Engagement"])
app.include_router(commerce.router, prefix="/api", tags=["Commerce"])
app.include_router(communication.router, prefix="/api", tags=["Communication"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(ws_chat.router, tags=["WebSocket"])
app.include_router(
    payment.router,
    prefix="/api/payments",
    tags=["Payments"],
)


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API", "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
