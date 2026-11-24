from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ChatSessionSummary(BaseModel):
    """
    Schema representing a conversation session summary for sidebar navigation.
    """
    id: str = Field(..., description="Unique session identifier")
    title: str = Field(..., description="Display title for the session")
    created_at: datetime = Field(..., description="UTC creation timestamp")
    updated_at: datetime = Field(..., description="UTC last updated timestamp")
    message_count: int = Field(default=0, description="Total messages in session")
    documents: list[str] = Field(
        default_factory=list,
        description="List of document filenames uploaded to this specific chat session",
    )

    model_config = ConfigDict(from_attributes=True)


class ChatSessionsListResponse(BaseModel):
    """
    Schema for listing multiple conversation sessions.
    """
    sessions: list[ChatSessionSummary] = Field(
        default_factory=list,
        description="List of chat sessions sorted with most recent first",
    )


class ChatRequest(BaseModel):
    """
    Schema for incoming chat query requests from the frontend.
    """
    query: str = Field(..., min_length=1, description="User's natural language question")
    session_id: str | None = Field(
        default=None,
        description="Optional session identifier. If omitted or null, a new session is initialized.",
    )


class ChatResponse(BaseModel):
    """
    Schema for chat query responses sent back to the frontend.
    """
    answer: str = Field(..., description="Grounded answer synthesized by the LLM")
    sources: list[str] = Field(
        default_factory=list,
        description="List of document citations/pages used to answer",
    )
    session_id: str = Field(..., description="Unique session identifier for this conversation")
    session_title: str | None = Field(default=None, description="Title of the session")


class UploadResponse(BaseModel):
    """
    Schema for file upload and indexing confirmation.
    """
    status: str = Field(..., description="Upload status (e.g., 'success')")
    filename: str = Field(..., description="Name of the processed PDF")
    chunks_indexed: int = Field(..., description="Number of text chunks embedded into ChromaDB")
    session_id: str = Field(..., description="Unique session identifier the document is attached to")
    message: str = Field(..., description="Human-readable status message")


class ChatMessageRecord(BaseModel):
    """
    Schema representing a stored chat message from the database.
    """
    id: int = Field(..., description="Message identifier")
    session_id: str = Field(..., description="Session identifier")
    role: str = Field(..., description="Role: 'user' or 'bot'")
    content: str = Field(..., description="Message text content")
    created_at: datetime = Field(..., description="UTC timestamp of the message")

    model_config = ConfigDict(from_attributes=True)


class ChatHistoryResponse(BaseModel):
    """
    Schema for returning stored chat history messages and attached documents for a specific session.
    """
    session_id: str = Field(..., description="Session identifier")
    title: str | None = Field(default=None, description="Session title")
    documents: list[str] = Field(
        default_factory=list,
        description="List of PDF documents attached to this chat session",
    )
    messages: list[ChatMessageRecord] = Field(
        default_factory=list,
        description="List of recorded chat messages in chronological order",
    )


class ClearHistoryResponse(BaseModel):
    """
    Schema for chat history deletion response.
    """
    status: str = Field(..., description="Operation status (e.g., 'success')")
    message: str = Field(..., description="Status summary message")
    deleted_count: int = Field(..., description="Number of messages removed")
