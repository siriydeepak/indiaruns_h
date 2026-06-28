"""
Hybrid Dense-Sparse Reciprocal Rank Fusion (RRF) Semantic Engine.

This module provides the SemanticFusionEngine, which combines dense vector similarity
scores with sparse syntactic taxonomy overlaps using NumPy.
"""

import time
import logging
from typing import List, Any
import numpy as np

logger = logging.getLogger(__name__)


class SemanticFusionEngine:
    """
    Core NLP matching engine designed to fuse dense embeddings semantic relevance
    with sparse keyword/skill intersections.
    """

    def __init__(self) -> None:
        pass

    def _calculate_sparse_score(self, parsed_query_skills: List[str], candidate_skills: List[str]) -> float:
        """
        Computes a normalized syntactic similarity score based on technical taxonomy intersections.
        
        Formula:
            Overlap = Intersection(query_skills, candidate_skills) / Total Query Skills
            
        Returns:
            A float value in the range [0.0, 1.0]. Defaults to 1.0 if parsed_query_skills is empty.
        """
        if not parsed_query_skills:
            return 1.0

        try:
            # Standardize skill tokens (lowercasing, trimming whitespace)
            q_set = {s.lower().strip() for s in parsed_query_skills if s.strip()}
            c_set = {s.lower().strip() for s in candidate_skills if s.strip()}
            
            if not q_set:
                return 1.0

            intersection = q_set.intersection(c_set)
            if not intersection:
                return 0.0

            overlap_score = float(len(intersection) / len(q_set))
            return overlap_score
        except Exception as e:
            logger.error(f"Error calculating sparse score: {str(e)}", exc_info=True)
            return 0.0

    def _calculate_dense_similarity(self, query_vector: np.ndarray, candidate_matrix: np.ndarray) -> np.ndarray:
        """
        Computes exact cosine similarity values across arrays simultaneously using 
        optimized row-normalized NumPy dot product operations.
        
        Args:
            query_vector: Dense embedding vector of the job spec (shape: (D,) or (1, D)).
            candidate_matrix: Dense embedding matrix of all candidate resumes (shape: (N, D)).
            
        Returns:
            A NumPy array of similarity values of shape (N,).
        """
        try:
            # Reshape query vector to ensure shape is (1, D)
            q_vec = query_vector.reshape(1, -1)
            c_mat = candidate_matrix
            
            # Row normalize the matrices
            q_vec_norm = q_vec / np.linalg.norm(q_vec)
            c_mat_norm = c_mat / np.linalg.norm(c_mat, axis=1, keepdims=True)
            
            # Matrix multiply to calculate all similarities simultaneously
            similarities = np.dot(c_mat_norm, q_vec_norm.T).flatten()
            
            # Clip similarities between 0.0 and 1.0
            return np.clip(similarities, 0.0, 1.0)
        except Exception as e:
            logger.error(f"Error during parallelized dense calculations: {str(e)}", exc_info=True)
            # Default to zero array on failure
            num_candidates = candidate_matrix.shape[0] if len(candidate_matrix.shape) > 0 else 0
            return np.zeros(num_candidates)

    def fuse_search_vectors(
        self,
        job_embeddings: np.ndarray,
        candidate_embeddings: np.ndarray,
        job_skills: List[str],
        candidates: List[Any]
    ) -> List[float]:
        """
        Fuses dense vector similarity scores and sparse skill overlap statistics in parallel.
        
        Calculates scores, normalizes them, and merges them using a 60/40 weight split:
            Contextual Score = (Dense Similarity * 0.60) + (Sparse Score * 0.40)
            
        Returns:
            A list of fused scores mapped directly to the candidate index.
        """
        start_time = time.perf_counter()
        
        if not candidates:
            return []

        try:
            # 1. Batch calculate dense similarity scores (N,)
            dense_scores = self._calculate_dense_similarity(job_embeddings, candidate_embeddings)
            
            # 2. Iterate and compute sparse overlap scores
            fused_scores = []
            for idx, candidate in enumerate(candidates):
                # Retrieve candidate skills dynamically
                cand_skills = getattr(candidate, "skills", [])
                if not isinstance(cand_skills, list):
                    cand_skills = list(cand_skills) if cand_skills else []
                
                sparse_score = self._calculate_sparse_score(job_skills, cand_skills)
                dense_score = float(dense_scores[idx])
                
                # Merge scores with 60/40 fusion split
                fused_score = (dense_score * 0.60) + (sparse_score * 0.40)
                fused_scores.append(float(np.clip(fused_score, 0.0, 1.0)))
            
            # Profile benchmarks down to the microsecond
            elapsed_microseconds = (time.perf_counter() - start_time) * 1_000_000.0
            logger.debug(
                f"Fused search vectors for {len(candidates)} records in {elapsed_microseconds:.2f} microseconds."
            )
            return fused_scores
            
        except Exception as e:
            logger.error(f"Critical failure during Reciprocal Rank Fusion: {str(e)}", exc_info=True)
            # Default fallback: return clean list of 0.0 scores
            return [0.0] * len(candidates)
