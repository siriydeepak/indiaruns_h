import pytest
import numpy as np
from typing import List, Any
from app.services.semantic_fusion import SemanticFusionEngine

class MockCandidate:
    """Mock candidate object for testing skills retrieval."""
    def __init__(self, skills: List[str]):
        self.skills = skills

@pytest.fixture
def engine() -> SemanticFusionEngine:
    return SemanticFusionEngine()

def test_sparse_score_basic(engine: SemanticFusionEngine) -> None:
    # Test perfect match
    assert engine._calculate_sparse_score(["Python", "React"], ["React", "Python"]) == 1.0
    
    # Test partial match
    assert engine._calculate_sparse_score(["Python", "React"], ["Python"]) == 0.5
    
    # Test zero overlap
    assert engine._calculate_sparse_score(["Python", "React"], ["Java"]) == 0.0

def test_sparse_score_case_insensitive_and_whitespace(engine: SemanticFusionEngine) -> None:
    # Test that case and whitespace differences are handled correctly
    assert engine._calculate_sparse_score([" python ", "React"], ["PYTHON", "react"]) == 1.0

def test_sparse_score_edge_cases(engine: SemanticFusionEngine) -> None:
    # Empty query skills defaults to 1.0
    assert engine._calculate_sparse_score([], ["Python"]) == 1.0
    
    # Empty candidate skills results in 0.0 if there are query skills
    assert engine._calculate_sparse_score(["Python"], []) == 0.0
    
    # Handling of empty/null-like strings in inputs
    assert engine._calculate_sparse_score(["Python", "", "   "], ["python"]) == 1.0

def test_dense_similarity_basic(engine: SemanticFusionEngine) -> None:
    # Setup simple query and candidate matrix
    query = np.array([1.0, 0.0])
    candidates = np.array([
        [1.0, 0.0],                # Parallel (cosine = 1.0)
        [0.0, 1.0],                # Orthogonal (cosine = 0.0)
        [0.70710678, 0.70710678],  # 45 degrees (cosine = 0.707)
        [-1.0, 0.0]                # Opposite direction (should clip to 0.0)
    ])
    
    similarities = engine._calculate_dense_similarity(query, candidates)
    
    assert similarities.shape == (4,)
    assert np.isclose(similarities[0], 1.0)
    assert np.isclose(similarities[1], 0.0)
    assert np.isclose(similarities[2], 0.70710678)
    assert np.isclose(similarities[3], 0.0)

def test_dense_similarity_shapes(engine: SemanticFusionEngine) -> None:
    # Query vector can be 1D (D,) or 2D (1, D)
    query_1d = np.array([1.0, 2.0, 3.0])
    query_2d = np.array([[1.0, 2.0, 3.0]])
    candidates = np.array([
        [1.0, 2.0, 3.0],
        [4.0, 5.0, 6.0]
    ])
    
    sim_1d = engine._calculate_dense_similarity(query_1d, candidates)
    sim_2d = engine._calculate_dense_similarity(query_2d, candidates)
    
    assert np.allclose(sim_1d, sim_2d)
    assert sim_1d.shape == (2,)

def test_dense_similarity_exception_handling(engine: SemanticFusionEngine) -> None:
    # When query vector and candidate matrix have mismatched dimensions
    query = np.array([1.0, 2.0])
    candidates = np.array([[1.0, 2.0, 3.0]])
    
    similarities = engine._calculate_dense_similarity(query, candidates)
    
    # Should default to 0.0 array of length 1 (number of candidates)
    assert similarities.shape == (1,)
    assert np.allclose(similarities, 0.0)

def test_fuse_search_vectors_basic(engine: SemanticFusionEngine) -> None:
    job_emb = np.array([1.0, 0.0])
    cand_embs = np.array([
        [1.0, 0.0],  # Dense similarity = 1.0
        [0.0, 1.0]   # Dense similarity = 0.0
    ])
    job_skills = ["Python", "React"]
    candidates = [
        MockCandidate(["Python"]),          # Overlap 1/2 = 0.5
        MockCandidate(["Python", "React"])  # Overlap 2/2 = 1.0
    ]
    
    # Composite score computation:
    # Candidate 0: dense=1.0, sparse=0.5 -> 1.0 * 0.6 + 0.5 * 0.4 = 0.8
    # Candidate 1: dense=0.0, sparse=1.0 -> 0.0 * 0.6 + 1.0 * 0.4 = 0.4
    scores = engine.fuse_search_vectors(job_emb, cand_embs, job_skills, candidates)
    
    assert len(scores) == 2
    assert np.isclose(scores[0], 0.8)
    assert np.isclose(scores[1], 0.4)

def test_fuse_search_vectors_empty(engine: SemanticFusionEngine) -> None:
    # When candidates list is empty, should return empty list
    scores = engine.fuse_search_vectors(np.array([]), np.array([]), [], [])
    assert scores == []

def test_fuse_search_vectors_exception_handling(engine: SemanticFusionEngine) -> None:
    # Trigger IndexError inside fuse_search_vectors by providing mismatched dimensions
    job_emb = np.array([1.0])
    cand_embs = np.array([[1.0]])  # Shape (1, 1) - only 1 embedding
    job_skills = ["Python"]
    candidates = [MockCandidate(["Python"]), MockCandidate(["React"])]  # 2 candidates
    
    scores = engine.fuse_search_vectors(job_emb, cand_embs, job_skills, candidates)
    
    # Should catch exception and return fallback list of zeros
    assert len(scores) == 2
    assert scores == [0.0, 0.0]
