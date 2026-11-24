from datetime import datetime, timezone
import logging
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.chat import ChatDocument, ChatMessage, ChatSession
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageRecord,
    ChatRequest,
    ChatResponse,
    ChatSessionSummary,
    ChatSessionsListResponse,
    ClearHistoryResponse,
    UploadResponse,
)
from app.services.rag import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["RAG Endpoints"])


def _generate_title(text: str) -> str:
    """Generate a clean, truncated title for a conversation based on the first query."""
    clean = " ".join(text.strip().split())
    if len(clean) > 36:
        return clean[:36] + "..."
    return clean or "New Conversation"


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and vectorize a PDF document attached to a specific chat session",
)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
    db: Session = Depends(get_db),
) -> UploadResponse:
    """
    Accepts a PDF document via multipart/form-data, extracts its text,
    splits it into overlapping chunks, generates vector embeddings with Gemini,
    and indexes them into ChromaDB scoped strictly to the provided session_id.
    If no session_id is provided, a new chat session is automatically initialized.
    """
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF (.pdf) documents are accepted.",
        )

    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        now_utc = datetime.now(timezone.utc)
        clean_session_id = (session_id or "").strip()

        # Resolve or create the chat session
        if not clean_session_id:
            clean_session_id = f"session_{uuid.uuid4().hex[:10]}"
            session = ChatSession(
                id=clean_session_id,
                title=f"Doc: {filename}",
                created_at=now_utc,
                updated_at=now_utc,
            )
            db.add(session)
        else:
            session = db.query(ChatSession).filter(ChatSession.id == clean_session_id).first()
            if not session:
                session = ChatSession(
                    id=clean_session_id,
                    title=f"Doc: {filename}",
                    created_at=now_utc,
                    updated_at=now_utc,
                )
                db.add(session)
            else:
                session.updated_at = now_utc
                if session.title == "New Conversation":
                    session.title = f"Doc: {filename}"

        # Vectorize and embed with session_id metadata tag
        chunks_count = rag_service.process_pdf(
            file_bytes=content,
            filename=filename,
            session_id=clean_session_id,
        )

        # Track the document association in SQLite
        doc_record = ChatDocument(
            session_id=clean_session_id,
            filename=filename,
            chunks_count=chunks_count,
            created_at=now_utc,
        )
        db.add(doc_record)
        db.commit()

        return UploadResponse(
            status="success",
            filename=filename,
            chunks_indexed=chunks_count,
            session_id=clean_session_id,
            message=f"Document '{filename}' uploaded and attached to conversation {clean_session_id}!",
        )

    except ValueError as e:
        logger.warning(f"Validation error during upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error processing document {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and vectorize document: {str(e)}",
        )


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Q&A against indexed documents scoped to the specific chat session",
)
async def chat_query(
    request: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    Accepts a natural-language query in JSON, performs similarity search
    in ChromaDB scoped to session_id, constructs an anti-hallucination prompt,
    generates a factual response using Google Gemini, and persists both query
    and answer to SQLite.
    """
    query_text = request.query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty.",
        )

    # Determine or generate session ID
    session_id = (request.session_id or "").strip()
    now_utc = datetime.now(timezone.utc)

    if not session_id:
        session_id = f"session_{uuid.uuid4().hex[:10]}"
        session = ChatSession(
            id=session_id,
            title=_generate_title(query_text),
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(session)
    else:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            session = ChatSession(
                id=session_id,
                title=_generate_title(query_text),
                created_at=now_utc,
                updated_at=now_utc,
            )
            db.add(session)
        else:
            session.updated_at = now_utc

    # Persist the incoming user message
    user_record = ChatMessage(
        session_id=session_id,
        role="user",
        content=query_text,
        created_at=now_utc,
    )
    db.add(user_record)
    db.commit()

    try:
        # Search documents belonging strictly to this chat session
        answer, sources = rag_service.query_rag(query=query_text, session_id=session_id)

        # Persist the generated bot response
        bot_record = ChatMessage(
            session_id=session_id,
            role="bot",
            content=answer,
            created_at=datetime.now(timezone.utc),
        )
        db.add(bot_record)
        db.commit()

        return ChatResponse(
            answer=answer,
            sources=sources,
            session_id=session_id,
            session_title=session.title,
        )

    except ValueError as e:
        logger.warning(f"Configuration or query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Inference error during chat query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response from AI: {str(e)}",
        )


@router.get(
    "/chat/sessions",
    response_model=ChatSessionsListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all recorded chat sessions with their attached documents",
)
async def list_chat_sessions(
    db: Session = Depends(get_db),
) -> ChatSessionsListResponse:
    """
    Returns all previous chat sessions ordered with the most recently active sessions first,
    including the list of documents attached to each chat.
    """
    try:
        # Auto-heal: verify distinct session_ids in ChatMessage exist in ChatSession
        existing_session_ids = {s.id for s in db.query(ChatSession.id).all()}
        orphan_rows = db.query(ChatMessage.session_id).distinct().all()
        for (o_id,) in orphan_rows:
            if o_id and o_id not in existing_session_ids:
                first_msg = (
                    db.query(ChatMessage)
                    .filter(ChatMessage.session_id == o_id, ChatMessage.role == "user")
                    .order_by(ChatMessage.id.asc())
                    .first()
                )
                title = _generate_title(first_msg.content) if first_msg else f"Chat {o_id[:8]}"
                now_utc = datetime.now(timezone.utc)
                db.add(ChatSession(id=o_id, title=title, created_at=now_utc, updated_at=now_utc))
                existing_session_ids.add(o_id)
        db.commit()

        # Query all sessions ordered by updated_at desc
        sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
        summaries = []
        for s in sessions:
            count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
            docs = (
                db.query(ChatDocument.filename)
                .filter(ChatDocument.session_id == s.id)
                .order_by(ChatDocument.id.asc())
                .all()
            )
            doc_names = [d[0] for d in docs]
            summaries.append(
                ChatSessionSummary(
                    id=s.id,
                    title=s.title,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                    message_count=count,
                    documents=doc_names,
                )
            )

        return ChatSessionsListResponse(sessions=summaries)

    except Exception as e:
        logger.error(f"Error retrieving chat sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list chat sessions: {str(e)}",
        )


@router.get(
    "/chat/history",
    response_model=ChatHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve stored chat history messages and attached documents for a specific session",
)
async def get_chat_history(
    session_id: str = Query(..., description="Session ID to retrieve"),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    """
    Fetches persistent chat messages and attached documents for the specified session_id ordered chronologically.
    """
    try:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        records = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.id.asc())
            .all()
        )
        docs = (
            db.query(ChatDocument.filename)
            .filter(ChatDocument.session_id == session_id)
            .order_by(ChatDocument.id.asc())
            .all()
        )
        doc_names = [d[0] for d in docs]

        return ChatHistoryResponse(
            session_id=session_id,
            title=session.title if session else "Conversation",
            documents=doc_names,
            messages=[ChatMessageRecord.model_validate(r) for r in records],
        )
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chat history: {str(e)}",
        )


@router.delete(
    "/chat/history",
    response_model=ClearHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a conversation session, attached document records, and its vector embeddings",
)
async def clear_chat_history(
    session_id: str = Query(..., description="Session ID to delete"),
    db: Session = Depends(get_db),
) -> ClearHistoryResponse:
    """
    Deletes the session record, all persisted messages, document records, and ChromaDB vector embeddings.
    """
    try:
        deleted_count = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .delete()
        )
        db.query(ChatDocument).filter(ChatDocument.session_id == session_id).delete()
        db.query(ChatSession).filter(ChatSession.id == session_id).delete()
        db.commit()

        # Clean up vector database chunks for this session
        rag_service.delete_session_vectors(session_id=session_id)

        return ClearHistoryResponse(
            status="success",
            message=f"Cleared {deleted_count} messages and attached documents from conversation {session_id}.",
            deleted_count=deleted_count,
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing chat history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear chat history: {str(e)}",
        )
