from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.rate_limit import rate_limit
from app.schemas.academic import LessonProgressUpdate
from app.services.file_service import delete_upload


def request_for(host: str):
    return SimpleNamespace(client=SimpleNamespace(host=host))


def test_rate_limit_rejects_after_limit():
    check = rate_limit("test-rate-limit", 2, 60)

    check(request_for("127.0.0.10"))
    check(request_for("127.0.0.10"))
    with pytest.raises(HTTPException) as error:
        check(request_for("127.0.0.10"))

    assert error.value.status_code == 429
    assert error.value.headers["Retry-After"]


def test_lesson_progress_rejects_negative_position():
    with pytest.raises(ValueError):
        LessonProgressUpdate(position_seconds=-1)


def test_delete_upload_stays_inside_upload_root(tmp_path, monkeypatch):
    import app.services.file_service as file_service

    upload_root = tmp_path / "uploads"
    target = upload_root / "lessons" / "video.mp4"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"video")
    monkeypatch.setattr(file_service.settings, "UPLOAD_DIR", str(upload_root))

    delete_upload("/uploads/lessons/video.mp4")
    assert not target.exists()

    outside = tmp_path / "outside.txt"
    outside.write_bytes(b"keep")
    delete_upload("/uploads/../outside.txt")
    assert outside.exists()


def test_delete_private_lesson_upload(tmp_path, monkeypatch):
    import app.services.file_service as file_service

    private_root = tmp_path / "private"
    target = private_root / "lessons" / "video.mp4"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"video")
    monkeypatch.setattr(file_service.settings, "PRIVATE_UPLOAD_DIR", str(private_root))

    delete_upload("/private-lessons/video.mp4")
    assert not target.exists()
