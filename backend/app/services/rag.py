import io
import logging
import time
import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """
    Core RAG Service handling PDF text extraction, chunking,
    vector embedding, Chroma storage (Docker or local fallback), and Gemini Q&A.
    Supports session-scoped document vectorization and retrieval.
    """

    def __init__(self) -> None:
        self._embeddings = None
        self._llm = None
        self._vector_store = None

    @property
    def embeddings(self) -> GoogleGenerativeAIEmbeddings:
        """Lazily initialize Google Gemini embeddings."""
        if self._embeddings is None:
            if not settings.google_api_key or settings.google_api_key == "your_gemini_api_key_here":
                raise ValueError(
                    "GOOGLE_API_KEY is not configured. Please set your Gemini API key in backend/.env"
                )
            # Strip any redundant 'models/' prefix for compatibility with google-genai SDK
            model_name = settings.embedding_model.replace("models/", "").strip()
            self._embeddings = GoogleGenerativeAIEmbeddings(
                model=model_name,
                google_api_key=settings.google_api_key,
            )
        return self._embeddings

    @property
    def llm(self) -> ChatGoogleGenerativeAI:
        """Lazily initialize Google Gemini chat model."""
        if self._llm is None:
            if not settings.google_api_key or settings.google_api_key == "your_gemini_api_key_here":
                raise ValueError(
                    "GOOGLE_API_KEY is not configured. Please set your Gemini API key in backend/.env"
                )
            llm_model = settings.gemini_model.replace("models/", "").strip()
            self._llm = ChatGoogleGenerativeAI(
                model=llm_model,
                google_api_key=settings.google_api_key,
                max_retries=2,
                timeout=30,
            )
        return self._llm

    @property
    def vector_store(self) -> Chroma:
        """
        Lazily initialize ChromaDB vector store.
        Attempts connection to Docker ChromaDB on host:port first;
        if Docker is not reachable, seamlessly falls back to local disk persistence.
        """
        if self._vector_store is None:
            docker_client = None
            if settings.chroma_host and settings.chroma_port:
                try:
                    client = chromadb.HttpClient(
                        host=settings.chroma_host,
                        port=settings.chroma_port,
                    )
                    client.heartbeat()
                    docker_client = client
                    logger.info(
                        f"Connected to ChromaDB running in Docker at http://{settings.chroma_host}:{settings.chroma_port}"
                    )
                except Exception as e:
                    logger.info(
                        f"ChromaDB Docker container not reachable ({e}). "
                        f"Using local persistent storage at {settings.chroma_persist_directory}"
                    )
                    docker_client = None

            if docker_client is not None:
                self._vector_store = Chroma(
                    client=docker_client,
                    collection_name=settings.chroma_collection_name,
                    embedding_function=self.embeddings,
                )
            else:
                self._vector_store = Chroma(
                    collection_name=settings.chroma_collection_name,
                    embedding_function=self.embeddings,
                    persist_directory=settings.chroma_persist_directory,
                )
        return self._vector_store

    def process_pdf(self, file_bytes: bytes, filename: str, session_id: str = "default") -> int:
        """
        Extract text from uploaded PDF bytes, split into chunks,
        embed with Gemini, and index into ChromaDB tagged with the specific session_id.
        Returns the number of indexed chunks.
        """
        reader = PdfReader(io.BytesIO(file_bytes))
        documents: list[Document] = []

        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                documents.append(
                    Document(
                        page_content=page_text,
                        metadata={
                            "page": idx + 1,
                            "source": filename,
                            "session_id": session_id,
                        },
                    )
                )

        if not documents:
            raise ValueError(
                f"No readable text could be extracted from '{filename}'. "
                "The PDF might be scanned or image-only."
            )

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        chunks = splitter.split_documents(documents)

        # Embed with automatic retry for transient network/DNS hiccups
        for attempt in range(1, 4):
            try:
                self.vector_store.add_documents(chunks)
                break
            except Exception as e:
                err_str = str(e)
                if attempt < 3 and (
                    "getaddrinfo" in err_str
                    or "connect" in err_str.lower()
                    or "timeout" in err_str.lower()
                ):
                    logger.warning(
                        f"Transient network glitch during embedding (attempt {attempt}/3): {e}. Retrying in 1.5s..."
                    )
                    time.sleep(1.5)
                else:
                    raise

        return len(chunks)

    def query_rag(self, query: str, session_id: str | None = None) -> tuple[str, list[str]]:
        """
        Perform similarity search in ChromaDB scoped to the given session_id,
        assemble augmented prompt, and invoke the Gemini LLM for a grounded factual response.
        """
        filter_dict = {"session_id": session_id} if session_id else None

        relevant_docs = []
        for attempt in range(1, 4):
            try:
                relevant_docs = self.vector_store.similarity_search(
                    query=query,
                    k=settings.top_k_retrieval,
                    filter=filter_dict,
                )
                break
            except Exception as e:
                err_str = str(e)
                if attempt < 3 and (
                    "getaddrinfo" in err_str
                    or "connect" in err_str.lower()
                    or "timeout" in err_str.lower()
                ):
                    logger.warning(
                        f"Transient network glitch during similarity search (attempt {attempt}/3): {e}. Retrying in 1.5s..."
                    )
                    time.sleep(1.5)
                else:
                    raise

        if not relevant_docs:
            return (
                "No relevant document context found for this conversation. "
                "Please upload a PDF document to this chat first to begin querying.",
                [],
            )

        context_parts: list[str] = []
        sources: list[str] = []

        for doc in relevant_docs:
            page = doc.metadata.get("page", "?")
            src = doc.metadata.get("source", "document.pdf")
            citation = f"{src} (Page {page})"
            if citation not in sources:
                sources.append(citation)
            context_parts.append(f"[{citation}]:\n{doc.page_content}")

        context_str = "\n\n".join(context_parts)

        system_instruction = (
            "You are an enterprise AI assistant for document Q&A. "
            "Answer the user's question accurately and concisely relying ONLY on the document context provided below.\n"
            "If the answer cannot be found in the context, explicitly respond with: "
            "'I cannot find the answer to that in the uploaded document(s).'\n"
            "Do not hallucinate or use external knowledge not present in the context."
        )

        user_prompt = f"DOCUMENT CONTEXT:\n{context_str}\n\nUSER QUESTION:\n{query}"

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=user_prompt),
        ]

        # Call Gemini LLM with retry for transient high-demand spikes
        answer = ""
        for attempt in range(1, 4):
            try:
                response = self.llm.invoke(messages)
                if isinstance(response.content, str):
                    answer = response.content
                elif isinstance(response.content, list):
                    answer = "".join(
                        [
                            part["text"]
                            if isinstance(part, dict) and "text" in part
                            else str(part)
                            for part in response.content
                        ]
                    )
                else:
                    answer = str(response.content)
                break
            except Exception as e:
                err_msg = str(e)
                if attempt < 3 and (
                    "503" in err_msg
                    or "504" in err_msg
                    or "UNAVAILABLE" in err_msg
                    or "DEADLINE_EXCEEDED" in err_msg
                    or "high demand" in err_msg.lower()
                    or "deadline" in err_msg.lower()
                    or "getaddrinfo" in err_msg
                ):
                    logger.warning(
                        f"Gemini server spike (attempt {attempt}/3): {e}. Retrying in 2s..."
                    )
                    time.sleep(2)
                else:
                    raise

        return answer, sources

    def delete_session_vectors(self, session_id: str) -> None:
        """
        Delete all vector embeddings associated with a specific session_id.
        """
        try:
            self.vector_store.delete(where={"session_id": session_id})
            logger.info(f"Deleted vector chunks for session {session_id}")
        except Exception as e:
            logger.warning(f"Could not delete vectors for session {session_id}: {e}")


# Global singleton instance for endpoint handlers
rag_service = RAGService()
