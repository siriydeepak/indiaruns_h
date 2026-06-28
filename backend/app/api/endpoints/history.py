"""
FastAPI Router for Recruiter Search Query Persistence and Analytics.

This module logs recruiter configurations (weights, job specifications, presets)
and computes aggregations for historical trends analysis.
"""

import time
import logging
import asyncio
import datetime
from typing import Optional, List, Dict, Any
from collections import Counter

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from google.cloud import firestore
from google.cloud.firestore import AsyncClient

logger = logging.getLogger(__name__)

router = APIRouter()

# Schema definition for Search History Ingest
class SearchLogRequest(BaseModel):
    """
    Validation schema for inbound recruiter query telemetry logging.
    """
    target_job_title: str = Field(..., min_length=1, description="The job title searched.")
    raw_text_length: int = Field(..., ge=0, description="The length in characters of the raw job spec description.")
    semantic_weight: float = Field(..., ge=0.0, le=1.0, description="recruiter controlled weight tuning ratio for semantic alignment.")
    behavioral_weight: float = Field(..., ge=0.0, le=1.0, description="recruiter controlled weight tuning ratio for behavioral heuristics.")
    active_preset: Optional[str] = Field(None, description="Preset chosen, mapping UI elements (e.g. 'ML Engineer', 'Cyber Security').")

    @field_validator("behavioral_weight")
    @classmethod
    def validate_weights_sum(cls, v: float, info: Any) -> float:
        """
        Validates that semantic_weight and behavioral_weight sum up to exactly 1.0 (with small tolerance).
        """
        values = info.data
        if "semantic_weight" in values:
            sem_w = values["semantic_weight"]
            total = sem_w + v
            if not abs(total - 1.0) < 1e-5:
                raise ValueError(
                    f"Weights must sum to 1.0. Got: semantic_weight ({sem_w}) + behavioral_weight ({v}) = {total}"
                )
        return v


# Persistent Mock Fallback Storage
_mock_db: List[Dict[str, Any]] = []
_total_queries_count: int = 0

# Defensive Async Firestore client initialization
db: Optional[AsyncClient] = None
try:
    # Initialize default AsyncClient. If credentials are not set, it might raise at init
    # or during network operations. We handle it safely.
    db = AsyncClient()
    logger.info("Firestore AsyncClient successfully initialized.")
except Exception as init_err:
    logger.warning(
        f"Firestore AsyncClient could not be initialized (likely missing credentials): {init_err}. "
        "Falling back to local in-memory persistence layer."
    )
    db = None


@router.post(
    "/log-query",
    status_code=status.HTTP_201_CREATED,
    summary="Log recruiter query telemetry and configuration weights",
    description="Saves search criteria, active weight balance parameters, and selected preset to persistence database."
)
async def log_query(request: SearchLogRequest) -> Dict[str, str]:
    """
    Persists query logs to Firestore collection 'recruiter_query_logs'.
    If Firestore is unavailable, logs are appended to an in-memory database fallback.
    """
    global _total_queries_count
    
    # Increment total query count tracked since app startup
    _total_queries_count += 1
    
    # Prepare standard payload
    payload = {
        "target_job_title": request.target_job_title.strip(),
        "raw_text_length": request.raw_text_length,
        "semantic_weight": round(request.semantic_weight, 4),
        "behavioral_weight": round(request.behavioral_weight, 4),
        "active_preset": request.active_preset.strip() if request.active_preset else None,
        "timestamp": datetime.datetime.now(datetime.timezone.utc)
    }

    firestore_success = False
    
    if db is not None:
        try:
            # Clone payload to use Firestore SERVER_TIMESTAMP placeholder
            fs_payload = payload.copy()
            fs_payload["timestamp"] = firestore.SERVER_TIMESTAMP
            
            # Asynchronously save payload with a defensive network timeout (3 seconds)
            await asyncio.wait_for(
                db.collection("recruiter_query_logs").add(fs_payload),
                timeout=3.0
            )
            firestore_success = True
            logger.info("Recruiter search query telemetry persisted successfully to Firestore.")
        except Exception as fs_err:
            logger.error(
                f"Firestore save attempt failed or timed out: {fs_err}. "
                "Resorting to in-memory fallback persistence."
            )

    if not firestore_success:
        # Fallback to local memory storage so user's query is not lost
        _mock_db.append(payload)
        logger.info(f"Query logged to local storage list. Current local memory cache size: {len(_mock_db)}")

    return {"status": "success", "message": "Search query telemetry recorded."}


@router.get(
    "/metrics-summary",
    status_code=status.HTTP_200_OK,
    summary="Retrieve analytical metrics for recent queries",
    description="Processes the last 50 queries to extract title frequencies, average weights, and total query count."
)
async def get_metrics_summary() -> Dict[str, Any]:
    """
    Reads the last 50 entries from persistence and calculates aggregation analytics.
    """
    start_time = time.perf_counter()
    entries: List[Dict[str, Any]] = []
    firestore_loaded = False

    if db is not None:
        try:
            # Fetch last 50 queries sorted by timestamp descending
            query = db.collection("recruiter_query_logs").order_by(
                "timestamp", direction=firestore.Query.DESCENDING
            ).limit(50)
            
            # Retrieve documents asynchronously with a defensive timeout (5 seconds)
            docs = await asyncio.wait_for(query.get(), timeout=5.0)
            
            for doc in docs:
                data = doc.to_dict()
                # Ensure timestamps are converted to python datetime if present
                if "timestamp" in data and data["timestamp"]:
                    # Handle typical Firebase DatetimeWithNanoseconds objects if returned
                    if hasattr(data["timestamp"], "to_datetime"):
                        data["timestamp"] = data["timestamp"].to_datetime()
                entries.append(data)
                
            firestore_loaded = True
            logger.info(f"Retrieved {len(entries)} records from Firestore successfully.")
        except Exception as fs_err:
            logger.error(
                f"Firestore query failed or timed out: {fs_err}. "
                "Falling back to local in-memory data for metrics calculations."
            )

    # Fallback to local memory store if Firestore was not accessible or failed
    if not firestore_loaded:
        # Sort local mock database by timestamp descending and take the last 50
        local_entries = sorted(_mock_db, key=lambda x: x["timestamp"], reverse=True)[:50]
        entries = local_entries
        logger.info(f"Retrieved {len(entries)} records from local in-memory storage.")

    # Process metrics using built-in Python collections
    total_count = len(entries)
    calc_start = time.perf_counter()

    if total_count > 0:
        avg_semantic = sum(e.get("semantic_weight", 0.0) for e in entries) / total_count
        avg_behavioral = sum(e.get("behavioral_weight", 0.0) for e in entries) / total_count
        
        # Most frequently searched job titles
        titles = [e.get("target_job_title", "").strip() for e in entries if e.get("target_job_title")]
        title_counts = Counter(titles)
        top_searched_titles = [{"title": t, "count": c} for t, c in title_counts.most_common(5)]
        
        # Distribution of active presets
        presets = [e.get("active_preset") for e in entries]
        preset_counts = Counter(presets)
        preset_distribution = {p if p is not None else "None": c for p, c in preset_counts.items()}
    else:
        avg_semantic = 0.0
        avg_behavioral = 0.0
        top_searched_titles = []
        preset_distribution = {}

    calculation_speed_ms = (time.perf_counter() - calc_start) * 1000.0
    total_elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    
    logger.info(f"Metrics computation duration: {calculation_speed_ms:.3f}ms. Total query duration: {total_elapsed_ms:.2f}ms.")

    formatted_entries = []
    for e in entries:
        ts = e.get("timestamp")
        if isinstance(ts, datetime.datetime):
            ts_str = ts.isoformat()
        else:
            ts_str = str(ts)
        formatted_entries.append({
            "target_job_title": e.get("target_job_title"),
            "raw_text_length": e.get("raw_text_length"),
            "semantic_weight": e.get("semantic_weight"),
            "behavioral_weight": e.get("behavioral_weight"),
            "active_preset": e.get("active_preset"),
            "timestamp": ts_str,
            "candidates_shortlisted": len(e.get("candidates", [])) or 5  # mock number of matching candidates
        })

    return {
        "total_queries_logged": _total_queries_count,
        "processed_samples_count": total_count,
        "average_semantic_weight": round(avg_semantic, 4),
        "average_behavioral_weight": round(avg_behavioral, 4),
        "top_searched_titles": top_searched_titles,
        "preset_distribution": preset_distribution,
        "recent_queries": formatted_entries,
        "performance_telemetry": {
            "computation_time_ms": round(calculation_speed_ms, 3),
            "total_response_time_ms": round(total_elapsed_ms, 3),
            "persistence_source": "firestore" if firestore_loaded else "in-memory_fallback"
        }
    }
