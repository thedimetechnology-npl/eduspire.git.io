from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import (
    academic, admin, analytics, assessment, auth, commerce, communication, engagement, payment, search, users,
)
from app.ws import chat as ws_chat

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.PRIVATE_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.APP_NAME, version="1.0.0",
              description="EduSphere Pro Learning Management System API")

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
