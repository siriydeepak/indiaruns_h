"""
Main Entrypoint for the Antigravity AI Intelligent Candidate Discovery Engine.

Initializes the FastAPI application instance, registers routers, configures
CORS filters, and triggers database seeding during application startup lifecycle.
"""

import time
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.vector_store import talent_store
from app.api.endpoints.discover import router as discover_router
from app.api.endpoints.history import router as history_router
from app.api.endpoints.migrate import router as migrate_router
from app.api.endpoints.chaos import router as chaos_router



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous lifespan manager handling startup and shutdown application hooks.
    """
    logger.info("Starting Antigravity core backend engine initialization lifecycle...")
    
    # Priming the mock database with multi-vector candidate profiles before HTTP server opens
    try:
        talent_store.seed_initial_profiles()
        logger.info("InMemoryTalentStore successfully primed with mock candidate dataset.")
    except Exception as e:
        logger.error(f"Critical failure during database startup seeding: {str(e)}", exc_info=True)
        
    # Pre-loading the SentenceTransformer embedding model to avoid first-request latency
    try:
        from app.services.ranking_engine import get_ranking_engine
        get_ranking_engine()
        logger.info("SentenceTransformer model successfully pre-loaded during startup.")
    except Exception as e:
        logger.error(f"Failed to pre-load SentenceTransformer model: {str(e)}", exc_info=True)
        
    yield
    
    logger.info("Shutting down Antigravity core backend engine lifecycle...")


# Initialize FastAPI application
app = FastAPI(
    title="Antigravity AI: Intelligent Candidate Discovery Engine",
    description="High-performance backend for semantic candidate search and predictive ranking.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORSMiddleware. Explicitly set allow_origins=["*"] to prevent Cross-Origin Resource Sharing issues.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(discover_router, prefix="/api", tags=["Discovery Engine"])
app.include_router(history_router, prefix="/api", tags=["History"])
app.include_router(migrate_router, prefix="/api", tags=["Migration Engine"])
app.include_router(chaos_router, prefix="/api", tags=["Chaos Engine"])




@app.get("/", tags=["Health"])
async def root_verification_gateway() -> Dict[str, Any]:
    """
    Fallback root endpoint for performance verification.
    """
    return {
        "status": "operational",
        "engine": "Antigravity Multi-Vector Ranking Framework",
        "timestamp": time.time()
    }
