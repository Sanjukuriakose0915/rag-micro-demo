from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db.session import Base


class ChatSession(Base):
    """
    SQLAlchemy ORM model representing a conversation session / thread.
    """
    __tablename__ = "chat_sessions"

    id = Column(String(100), primary_key=True, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ChatMessage(Base):
    """
    SQLAlchemy ORM model representing a single chat message (user query or bot response).
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(100), default="default", index=True, nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "bot"
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ChatDocument(Base):
    """
    SQLAlchemy ORM model representing a document uploaded to a specific chat session.
    """
    __tablename__ = "chat_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(100), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    chunks_count = Column(Integer, default=0, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
