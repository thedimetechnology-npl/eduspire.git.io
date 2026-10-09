from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.engagement import Conversation, Message
from app.models.user import User
from app.schemas.engagement import ConversationOut, ConversationStart, MessageCreate, MessageOut
from app.services.file_service import save_upload
from app.services.notification_service import notify_new_message

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    convos = db.query(Conversation).filter(
        or_(Conversation.participant_a_id == user.id, Conversation.participant_b_id == user.id)
    ).all()

    out = []
    for c in convos:
        other_id = c.participant_b_id if c.participant_a_id == user.id else c.participant_a_id
        other = db.query(User).filter(User.id == other_id).first()
        last = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.sent_at.desc()).first()
        unread = db.query(Message).filter(
            Message.conversation_id == c.id, Message.sender_id != user.id,
        ).count()  # simplified unread count (no read-receipts table in this scope)
        out.append(ConversationOut(
            id=c.id, other_user_id=other_id, other_user_name=other.full_name if other else "Unknown",
            other_user_role=other.role.value if other else "", last_message=last.content if last else None,
            last_message_at=last.sent_at if last else None, unread_count=unread,
        ))

    # ✅ FIXED: Always return a datetime so mixed types don't crash the sort
    epoch = datetime.min.replace(tzinfo=timezone.utc)
    def sort_key(convo):
        if convo.last_message_at is None:
            return epoch
        # Ensure tz-aware to compare consistently
        dt = convo.last_message_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    return sorted(out, key=sort_key, reverse=True)


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def start_conversation(payload: ConversationStart, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    other = db.query(User).filter(User.id == payload.other_user_id).first()
    if not other:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Conversation).filter(
        or_(
            (Conversation.participant_a_id == user.id) & (Conversation.participant_b_id == other.id),
            (Conversation.participant_a_id == other.id) & (Conversation.participant_b_id == user.id),
        )
    ).first()
    if existing:
        convo = existing
    else:
        convo = Conversation(participant_a_id=user.id, participant_b_id=other.id)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    return ConversationOut(
        id=convo.id, other_user_id=other.id, other_user_name=other.full_name,
        other_user_role=other.role.value, unread_count=0,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: int, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    convo = _owned_conversation(db, conversation_id, user)
    messages = db.query(Message).filter(Message.conversation_id == convo.id).order_by(Message.sent_at).all()
    out = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        out.append(MessageOut(
            id=m.id, conversation_id=m.conversation_id, sender_id=m.sender_id,
            sender_name=sender.full_name if sender else None, content=m.content,
            file_url=m.file_url, sent_at=m.sent_at,
        ))
    return out


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(conversation_id: int, payload: MessageCreate, user: User = Depends(require_role("student", "teacher", "admin")), db: Session = Depends(get_db)):
    convo = _owned_conversation(db, conversation_id, user)
    message = Message(conversation_id=convo.id, sender_id=user.id, content=payload.content, file_url=payload.file_url)
    db.add(message)
    db.flush()

    other_id = convo.participant_b_id if convo.participant_a_id == user.id else convo.participant_a_id
    notify_new_message(db, other_id, user.full_name)

    db.commit()
    db.refresh(message)
    return MessageOut(
        id=message.id, conversation_id=message.conversation_id, sender_id=message.sender_id,
        sender_name=user.full_name, content=message.content, file_url=message.file_url, sent_at=message.sent_at,
    )


@router.post("/messages/upload")
def upload_message_file(file: UploadFile = File(...), user: User = Depends(require_role("student", "teacher", "admin"))):
    return {"url": save_upload(file, "messages")}


def _owned_conversation(db: Session, conversation_id: int, user: User) -> Conversation:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo or user.id not in (convo.participant_a_id, convo.participant_b_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return convo