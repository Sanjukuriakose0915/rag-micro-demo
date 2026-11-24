import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router
from app.db.session import Base, engine
import app.models.chat  # noqa: F401 - Register models with SQLAlchemy Base

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("rag-micro-demo")

# Create database tables automatically upon startup
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}", exc_info=True)

# Initialize FastAPI application
app = FastAPI(
    title="Enterprise RAG Micro-Service",
    description="Backend API for proprietary document parsing, vector indexing, Gemini-powered Q&A, and chat persistence.",
    version="1.1.0",
)

# Configure Cross-Origin Resource Sharing (CORS) for Vite frontend dev server
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount RAG API router under /api/v1
app.include_router(api_router)


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    """Root health-check endpoint."""
    return {
        "status": "healthy",
        "service": "Enterprise RAG API",
        "version": "1.1.0",
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Service health probe."""
    return {"status": "ok"}
