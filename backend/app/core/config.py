from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory: E:\rag-micro-demo\backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """
    Application configuration loaded from backend/.env using Pydantic Settings.
    """
    # Google Gemini API Key
    google_api_key: str = ""

    # Models
    gemini_model: str = "gemini-3.5-flash-lite"
    embedding_model: str = "gemini-embedding-001"

    # SQLite Chat History Database
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'chat_history.db').as_posix()}"

    # ChromaDB Vector Store (Docker & Local fallback settings)
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_persist_directory: str = str(BACKEND_DIR / "chroma_data")
    chroma_collection_name: str = "rag_documents"

    # Document Chunking Hyperparameters
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_retrieval: int = 4

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
