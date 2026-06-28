"""
Core Configuration Module for the Intelligent Candidate Discovery Engine.

This module defines the Pydantic Settings class that loads and validates
environment variables for the application.

Engineering Note: Local vs. Cloud Embeddings
-------------------------------------------
This platform uses local dense vector embedding computations (via Sentence-Transformers)
rather than relying on external third-party cloud APIs (such as OpenAI or Cohere) for
the following critical reasons:
1. Speed (Low Latency): Eliminates network round-trip latency (HTTP/gRPC overhead),
   enabling sub-millisecond candidate embedding generations under load.
2. Security & Compliance: Resumes, CVs, and behavioral profiles contain highly
   sensitive PII (Personally Identifiable Information). Local calculations guarantee
   that zero data leaves our secure network boundary, maintaining strict compliance
   with data privacy laws (GDPR, CCPA).
3. Cost & Scalability: Running vector computations locally on standard server CPU/GPU
   infrastructure scales deterministically without recurring API call billing or rate-limit
   throttling during bulk resume ingestion.
"""

from typing import Any, Dict
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings class backed by Pydantic and Pydantic Settings.
    
    Loads configuration parameters from environment variables and .env file.
    """
    
    # API Server configuration
    PORT: int = 8000
    
    # ML & Embedding Service configuration
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    
    # Scoring engine weights (Must sum to 1.0)
    WEIGHT_SEMANTIC_FIT: float = 0.60
    WEIGHT_BEHAVIORAL_SIGNAL: float = 0.40

    # Pydantic Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_weights(self) -> "Settings":
        """
        Validates that semantic fit and behavioral signal weights sum to 1.0.
        
        If they do not sum to 1.0, they will be normalized or raise a validation error
        depending on requirements. Here, we raise a ValueError for strict configuration integrity.
        """
        total_weight = self.WEIGHT_SEMANTIC_FIT + self.WEIGHT_BEHAVIORAL_SIGNAL
        # Using a small tolerance for floating point comparisons
        if not abs(total_weight - 1.0) < 1e-6:
            raise ValueError(
                f"Weights WEIGHT_SEMANTIC_FIT ({self.WEIGHT_SEMANTIC_FIT}) and "
                f"WEIGHT_BEHAVIORAL_SIGNAL ({self.WEIGHT_BEHAVIORAL_SIGNAL}) must sum to 1.0. "
                f"Current sum: {total_weight}"
            )
        return self


settings = Settings()
