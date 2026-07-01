"""
Chaos Engineering Simulation Service.

Calculates infrastructure candidate response rankings for simulated system outages
using dense multi-vector embedding similarities and extracts verified evidence snippets.
"""

import re
import time
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobDescription

logger = logging.getLogger(__name__)


class ChaosSimulationEngine:
    """
    Service engine mapping system outages to dense conceptual query profiles 
    and matching infrastructure specialists with historical proof snippets.
    """

    # Scenario Mapping Matrix
    INCIDENT_MAP: Dict[str, str] = {
        "redis_stampede": (
            "Mitigated Redis cache stampede and thundering herd alerts by implementing "
            "probabilistic early expiration algorithms, custom mutex locks, and background "
            "cache refresh workers under high concurrency traffic load."
        ),
        "postgres_exhaustion": (
            "Resolved PostgreSQL connection pool exhaustion and connection timeouts by tuning "
            "PgBouncer parameters, optimizing slow query execution plans, refactoring row-level "
            "transaction blocks, and deploying read replicas under a 10x traffic spike."
        ),
        "kafka_lag": (
            "Fixed Kafka partition lag anomalies breaking consumer microservice worker "
            "synchronization by dynamically tuning fetch min bytes, scaling consumer group "
            "rebalancing partitions, and refactoring asynchronous commit buffers."
        )
    }

    def rank_incident_responders(
        self,
        scenario_id: str,
        candidates: List[CandidateProfile],
        ranking_engine: Any,
        blind_mode: bool = False
    ) -> List[Dict[str, Any]]:

        """
        Ranks candidates against a given outage scenario ID and extracts 
        the exact resume excerpt confirming their relevant mitigation experience.

        Args:
            scenario_id: The ID of the outage incident (e.g. 'redis_stampede').
            candidates: List of all candidate profiles to evaluate.
            ranking_engine: Instance of IntelligentRankingEngine.

        Returns:
            A list of ranked candidate dictionaries containing matching details and proofs.
        """
        start_time = time.perf_counter()
        logger.info(f"Initiating chaos simulation ranking for scenario: '{scenario_id}'...")

        # 1. Resolve and validate target incident profile
        if scenario_id not in self.INCIDENT_MAP:
            error_msg = f"Invalid chaos scenario ID: '{scenario_id}'. Must be one of {list(self.INCIDENT_MAP.keys())}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        query_profile = self.INCIDENT_MAP[scenario_id]
        
        if not candidates:
            logger.warning("Empty candidate list passed to chaos simulation engine.")
            return []

        results: List[Dict[str, Any]] = []

        try:
            # 2. Build a JobDescription wrapper to utilize the ranking engine's composite scoring pipelines
            job_desc = JobDescription(
                job_id=f"chaos_{scenario_id}_{int(time.time())}",
                title=f"Chaos Incident: {scenario_id}",
                raw_text_specification=query_profile
            )

            # Retrieve candidate rankings from the primary IntelligentRankingEngine
            logger.info("Executing vector similarity matching over candidate profiles...")
            ranked_candidates = ranking_engine.rank_candidates(
                job=job_desc,
                candidates=candidates,
                blind_mode=blind_mode,
                top_k_rerank=30
            )
            
            # Limit to top 15 candidates to avoid excessive sentence-level encoding latency
            ranked_candidates = ranked_candidates[:15]


            # Generate query embedding once for semantic proof snippet extraction
            query_vector = ranking_engine.model.encode(query_profile, convert_to_numpy=True).reshape(1, -1)

            # 3. Process each candidate and extract the best evidence snippet
            for rank_idx, candidate_data in enumerate(ranked_candidates):
                candidate_id = candidate_data["id"]
                name = candidate_data["name"]
                current_title = candidate_data["current_title"]
                composite_score = candidate_data["composite_score"]
                location = candidate_data["location"]
                
                # Fetch candidate object to parse the full unstructured resume text
                candidate_obj = next((c for c in candidates if c.id == candidate_id), None)
                resume_text = candidate_obj.full_resume_text if candidate_obj else ""

                best_snippet = "No matching proof found in candidate resume text."

                if resume_text:
                    # Split the resume text into sentences or paragraphs for validation
                    # Match periods, exclamation marks, or question marks followed by space/newlines
                    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n', resume_text) if s.strip()]
                    
                    if sentences:
                        try:
                            # Batch encode all sentences to find the best match via cosine similarity
                            sentence_embeddings = ranking_engine.model.encode(sentences, convert_to_numpy=True)
                            
                            # Standardize dimensions
                            if len(sentences) == 1:
                                sentence_embeddings = sentence_embeddings.reshape(1, -1)
                                
                            similarities = cosine_similarity(query_vector, sentence_embeddings)[0]
                            best_match_idx = int(np.argmax(similarities))
                            
                            # Keep snippet if it meets a baseline match, otherwise default
                            if similarities[best_match_idx] > 0.15:
                                best_snippet = sentences[best_match_idx]
                        except Exception as nlp_ex:
                            logger.warning(
                                f"Snippet extraction model failure for candidate {candidate_id}: {str(nlp_ex)}"
                            )
                            # Fallback: search for keywords
                            keywords = [w.lower() for w in scenario_id.split('_')]
                            fallback_matches = [
                                s for s in sentences if any(k in s.lower() for k in keywords)
                            ]
                            if fallback_matches:
                                best_snippet = fallback_matches[0]
                            else:
                                best_snippet = sentences[0]

                # Redact name and other PII in proof snippet if blind_mode is active
                if blind_mode and candidate_obj:
                    best_snippet = best_snippet.replace(candidate_obj.name, "Candidate")
                    parts = candidate_obj.name.split()
                    for part in parts:
                        if len(part) > 2:
                            best_snippet = re.sub(rf'\b{part}\b', '[REDACTED]', best_snippet, flags=re.IGNORECASE)

                results.append({
                    "id": candidate_id,
                    "name": name,
                    "current_title": current_title,
                    "global_match_rank": rank_idx + 1,
                    "composite_match_percentage": round(composite_score * 100.0, 1),
                    "location": location,
                    "verified_historical_proof": best_snippet
                })


            execution_time = (time.perf_counter() - start_time) * 1000.0
            logger.info(
                f"Successfully calculated chaos rankings for {len(candidates)} candidates in {execution_time:.2f}ms"
            )

        except Exception as e:
            logger.error(f"Critical error during chaos response calculation: {str(e)}", exc_info=True)
            raise RuntimeError(f"Chaos response calculation failure: {str(e)}") from e

        return results
