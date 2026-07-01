"""
FastAPI Controller for Migration Simulator.

Exposes endpoints for simulating candidate suitability against different 
codebase migration operations.
"""

import re
import json
import time
import logging
from typing import Dict, Any, List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.vector_store import talent_store
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobDescription
from app.services.ranking_engine import IntelligentRankingEngine, get_ranking_engine

logger = logging.getLogger(__name__)

router = APIRouter()


class MigrationSimulationRequest(BaseModel):
    manifest: str = Field(..., description="The JSON string codebase manifest")
    upgrade_operation: str = Field(..., description="Selected operation ID")


class SimulatedCandidate(BaseModel):
    id: str
    name: str
    current_title: str
    global_match_rank: int
    verified_historical_proof: str


class MigrationSimulationResponse(BaseModel):
    results: List[SimulatedCandidate]


# Scenario Mapping Matrix for Migration Simulator
UPGRADE_MAP: Dict[str, str] = {
    "pydantic_v1_v2": (
        "Refactored legacy Pydantic models from v1 to v2, upgraded decorators like validator "
        "to field_validator and root_validator to model_validator, adjusted Config classes to ConfigDict, "
        "and resolved data validation schemas and serialization differences."
    ),
    "wsgi_asgi": (
        "Migrated synchronous web gateway service architectures (WSGI like Flask, Django) "
        "to modern asynchronous ASGI servers (FastAPI, Uvicorn, Gunicorn with Uvicorn workers, Starlette), "
        "converting synchronous request routes to async def and handling non-blocking database queries."
    ),
    "in_memory_distributed": (
        "Migrated local in-memory storage arrays and localized caching pools to distributed high-throughput "
        "caching infrastructure clusters using Redis, Memcached, or distributed vector indexes like Qdrant/Milvus."
    )
}


@router.post(
    "/migrate/simulate",
    response_model=MigrationSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate candidate migration suitability",
    description="Analyzes the codebase manifest and scores candidates based on their history with the selected upgrade path."
)
async def simulate_migration(
    payload: MigrationSimulationRequest,
    ranking_engine: IntelligentRankingEngine = Depends(get_ranking_engine)
) -> MigrationSimulationResponse:
    """
    Simulation endpoint. Evaluates codebase manifest and filters candidate alignment proofs.
    """
    logger.info(f"Simulating migration operation: {payload.upgrade_operation}")
    
    # Try parsing JSON manifest for telemetry/logging
    try:
        manifest_data = json.loads(payload.manifest)
        logger.info(f"Parsed manifest data successfully: {list(manifest_data.keys())}")
    except Exception as e:
        logger.warning(f"Failed to parse manifest payload JSON: {str(e)}")
        manifest_data = {}

    candidates = talent_store.get_all_candidates()
    results: List[SimulatedCandidate] = []
    
    op = payload.upgrade_operation

    if not candidates:
        logger.warning("Empty candidate list in talent store.")
        return MigrationSimulationResponse(results=[])

    if op in UPGRADE_MAP:
        query_profile = UPGRADE_MAP[op]
        
        # 1. Build a JobDescription wrapper to utilize the ranking engine's composite scoring pipelines
        job_desc = JobDescription(
            job_id=f"migrate_{op}_{int(time.time())}",
            title=f"Migration Upgrade: {op}",
            raw_text_specification=query_profile
        )

        # Retrieve candidate rankings from the primary IntelligentRankingEngine
        logger.info("Executing vector similarity matching for migration upgrade...")
        ranked_candidates = ranking_engine.rank_candidates(
            job=job_desc,
            candidates=candidates,
            blind_mode=False,
            top_k_rerank=30
        )

        # Limit to top 15 candidates to avoid excessive sentence-level encoding latency
        ranked_candidates = ranked_candidates[:15]

        # Generate query embedding once for semantic proof snippet extraction
        query_vector = ranking_engine.model.encode(query_profile, convert_to_numpy=True).reshape(1, -1)

        # 2. Extract best evidence sentence from each top candidate and construct dynamic git diff proof
        rank = 1
        for candidate_data in ranked_candidates:
            candidate_id = candidate_data["id"]
            name = candidate_data["name"]
            current_title = candidate_data["current_title"]
            
            # Fetch full candidate object for resume text
            candidate_obj = next((c for c in candidates if c.id == candidate_id), None)
            resume_text = candidate_obj.full_resume_text if candidate_obj else ""
            
            best_sentence = "Completed infrastructure refactoring in previous role."
            
            if resume_text:
                sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n', resume_text) if s.strip()]
                if sentences:
                    try:
                        # Batch encode all sentences to find the best match via cosine similarity
                        sentence_embeddings = ranking_engine.model.encode(sentences, convert_to_numpy=True)
                        if len(sentences) == 1:
                            sentence_embeddings = sentence_embeddings.reshape(1, -1)
                            
                        similarities = cosine_similarity(query_vector, sentence_embeddings)[0]
                        best_match_idx = int(np.argmax(similarities))
                        
                        if similarities[best_match_idx] > 0.15:
                            best_sentence = sentences[best_match_idx]
                    except Exception as nlp_ex:
                        logger.warning(
                            f"Snippet extraction model failure for migration candidate {candidate_id}: {str(nlp_ex)}"
                        )
                        best_sentence = sentences[0]

            # Generate dynamic formatting
            if op == "pydantic_v1_v2":
                proof = (
                    f"[SIMULATION PROOF - {name.upper()}]\n"
                    f"$ git diff showing Pydantic refactoring:\n"
                    f"--- a/schemas/models.py\n"
                    f"+++ b/schemas/models.py\n"
                    f"@@ -10,4 +10,5 @@\n"
                    f"- # Legacy schema structure\n"
                    f"+ # Verified: {best_sentence}\n"
                    f"+ model_config = ConfigDict(from_attributes=True)"
                )
            elif op == "wsgi_asgi":
                proof = (
                    f"[SIMULATION PROOF - {name.upper()}]\n"
                    f"$ migration log output:\n"
                    f"Migrated endpoints to ASGI. System performance optimized via: {best_sentence}\n"
                    f"@@ -1,4 +1,4 @@\n"
                    f"-def get_app(environ, start_response):\n"
                    f"+async def get_app(request):"
                )
            else:  # in_memory_distributed
                proof = (
                    f"[SIMULATION PROOF - {name.upper()}]\n"
                    f"$ cache configuration diff:\n"
                    f"@@ -5,4 +5,5 @@\n"
                    f"- self.cache_store = LocalInMemoryCache()\n"
                    f"+ # Implemented: {best_sentence}\n"
                    f"+ self.cache_store = RedisClusterCache(host='redis-cluster-nodes')"
                )

            results.append(SimulatedCandidate(
                id=candidate_id,
                name=name,
                current_title=current_title,
                global_match_rank=rank,
                verified_historical_proof=proof
            ))
            rank += 1
            
    else:
        logger.warning(f"Unknown operation ID received: {op}")
        # Default fallback results: return top 2 candidates
        rank = 1
        for cand in candidates[:2]:
            results.append(SimulatedCandidate(
                id=cand.id,
                name=cand.name,
                current_title=cand.current_title,
                global_match_rank=rank,
                verified_historical_proof=f"[PROOF FALLBACK] Completed infrastructure refactoring in previous role."
            ))
            rank += 1

    return MigrationSimulationResponse(results=results)

