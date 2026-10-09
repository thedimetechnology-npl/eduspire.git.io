import os
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {
    ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif",
    ".mp4", ".mov", ".webm", ".zip", ".txt", ".csv",
}

ALLOWED_CONTENT_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime",
    "video/webm", "application/zip", "text/plain", "text/csv",
}


def save_upload(file: UploadFile, subdir: str) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail=f"File type '{ext}' is not allowed")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unsupported content type")

    is_private_lesson = subdir == "lessons"
    upload_root = settings.PRIVATE_UPLOAD_DIR if is_private_lesson else settings.UPLOAD_DIR
    target_dir = os.path.join(upload_root, subdir)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(target_dir, filename)
    max_upload_mb = settings.MAX_VIDEO_UPLOAD_MB if file.content_type and file.content_type.startswith("video/") else settings.MAX_UPLOAD_MB
    max_bytes = max_upload_mb * 1024 * 1024
    total_bytes = 0
    try:
        with open(full_path, "wb") as output:
            while chunk := file.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        detail=f"File too large. Max is {max_upload_mb}MB.",
                    )
                output.write(chunk)
    except Exception:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise

    if is_private_lesson:
        return f"/private-lessons/{filename}"
    return f"/uploads/{subdir}/{filename}"


def storage_usage_mb() -> float:
    total = 0
    for root, _, files in os.walk(settings.UPLOAD_DIR):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass
    return round(total / (1024 * 1024), 2)


def delete_upload(url: Optional[str]) -> None:
    if not url or not (url.startswith("/uploads/") or url.startswith("/private-lessons/")):
        return
    if url.startswith("/private-lessons/"):
        relative_path = os.path.join("lessons", url.removeprefix("/private-lessons/"))
        upload_root = os.path.abspath(settings.PRIVATE_UPLOAD_DIR)
    else:
        relative_path = url.removeprefix("/uploads/")
        upload_root = os.path.abspath(settings.UPLOAD_DIR)
    full_path = os.path.abspath(os.path.join(upload_root, relative_path))
    if not full_path.startswith(f"{upload_root}{os.sep}"):
        return
    try:
        os.remove(full_path)
    except FileNotFoundError:
        pass
