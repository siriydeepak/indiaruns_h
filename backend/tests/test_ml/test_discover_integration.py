import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.vector_store import talent_store

client = TestClient(app)

def test_discover_integration_experience_scoring_10_years():
    # 1. Post a job specification requiring 10+ years of experience
    payload = {
        "job_id": "job_integration_10yr",
        "title": "Principal Architect",
        "raw_text_specification": "Looking for a Principal Software Engineer with 10+ years of experience in distributed systems.",
        "flexible_skills_override": None,
        "weight_tuning_override": None
    }
    
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["job_id"] == "job_integration_10yr"
    assert "results" in data
    
    # Check that candidates are sorted by composite_score in descending order
    results = data["results"]
    assert len(results) > 0
    scores = [cand["composite_score"] for cand in results]
    assert scores == sorted(scores, reverse=True)
    
    # Elena Rostova (10 years) and Jane Doe (12 years) meet the requirement (exp_score = 1.0)
    # and should be ranked higher than those who fall short (like Sarah Jenkins with 8 years or Liam O'Connor with 5 years)
    # Let's map candidate name to score
    cand_by_name = {cand["name"]: cand for cand in results}
    
    if "Dr. Elena Rostova" in cand_by_name and "Sarah Jenkins" in cand_by_name:
        assert cand_by_name["Dr. Elena Rostova"]["composite_score"] >= cand_by_name["Sarah Jenkins"]["composite_score"]
        
    if "Jane Doe" in cand_by_name and "Liam O'Connor" in cand_by_name:
        assert cand_by_name["Jane Doe"]["composite_score"] >= cand_by_name["Liam O'Connor"]["composite_score"]

def test_discover_integration_blind_mode_anonymization():
    # 2. Post a discovery request in blind mode
    payload = {
        "job_description": {
            "job_id": "job_integration_blind",
            "title": "Senior Engineer",
            "raw_text_specification": "We need a senior programmer with React experience.",
            "flexible_skills_override": None,
            "weight_tuning_override": None
        },
        "blind_mode": True
    }
    
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "results" in data
    results = data["results"]
    assert len(results) > 0
    
    for candidate in results:
        # Candidate names, locations, and gender should be redacted with hashed suffixes
        name = candidate["name"]
        location = candidate["location"]
        gender = candidate["gender"]
        
        assert name.startswith("REDACTED_NAME_")
        assert location.startswith("REDACTED_LOC_")
        assert gender.startswith("REDACTED_GEN_")
        assert candidate["full_resume_text"] is None

def test_discover_integration_empty_spec_defensive():
    # 3. Post a job specification with empty text
    payload = {
        "job_id": "job_integration_empty",
        "title": "Empty Spec",
        "raw_text_specification": "",
        "flexible_skills_override": None,
        "weight_tuning_override": None
    }
    
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["job_id"] == "job_integration_empty"
    # Should default to 0 required experience years and return all candidates
    assert len(data["results"]) > 0
