import json
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import jwt

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.engagement import Conversation, Message
from app.models.user import User
from app.services.notification_service import notify_new_message

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, conversation_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(conversation_id, []).append(ws)

    def disconnect(self, conversation_id: int, ws: WebSocket):
        if conversation_id in self.active and ws in self.active[conversation_id]:
            self.active[conversation_id].remove(ws)

    async def broadcast(self, conversation_id: int, payload: dict):
        sockets = list(self.active.get(conversation_id, []))
        dead = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(conversation_id, ws)


manager = ConnectionManager()


@router.websocket("/ws/chat/{conversation_id}")
async def chat_socket(websocket: WebSocket, conversation_id: int, token: str = ""):
    db = SessionLocal()
    try:
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                user = None
            else:
                user = db.query(User).filter(
                    User.id == int(payload.get("sub", 0))).first()
                if user and (
                    not user.is_active
                    or not user.is_verified
                    or payload.get("tv", 0) != user.token_version
                ):
                    user = None
        except (jwt.PyJWTError, KeyError, ValueError):
            user = None

        convo = db.query(Conversation).filter(
            Conversation.id == conversation_id).first()
        if not user or not convo or user.id not in (convo.participant_a_id, convo.participant_b_id):
            await websocket.close(code=4401)
            return

        await manager.connect(conversation_id, websocket)
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue
                content = data.get("content")
                file_url = data.get("file_url")
                if not content and not file_url:
                    continue
                if content and len(content) > 5000:
                    continue

                message = Message(conversation_id=conversation_id,
                                  sender_id=user.id, content=content, file_url=file_url)
                db.add(message)
                db.commit()
                db.refresh(message)

                other_id = (
                    convo.participant_b_id
                    if user.id == convo.participant_a_id
                    else convo.participant_a_id
                )
                try:
                    notify_new_message(db, user_id=other_id, sender_name=user.full_name)
                    db.commit()
                except Exception:
                    logger.exception("Failed to create message notification")

                await manager.broadcast(conversation_id, {
                    "id": message.id, "conversation_id": conversation_id, "sender_id": user.id,
                    "sender_name": user.full_name, "content": message.content, "file_url": message.file_url,
                    "sent_at": message.sent_at.isoformat(),
                })
        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("WebSocket error")
        finally:
            manager.disconnect(conversation_id, websocket)
    finally:
        db.close()
