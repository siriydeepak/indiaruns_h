import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_log_query_success():
    payload = {
        "target_job_title": "ML Engineer",
        "raw_text_length": 500,
        "semantic_weight": 0.60,
        "behavioral_weight": 0.40,
        "active_preset": "ML Engineer"
    }
    response = client.post("/api/log-query", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "success"

def test_log_query_invalid_weights():
    # Weights sum to 1.1 which is invalid
    payload = {
        "target_job_title": "ML Engineer",
        "raw_text_length": 500,
        "semantic_weight": 0.70,
        "behavioral_weight": 0.40,
        "active_preset": "ML Engineer"
    }
    response = client.post("/api/log-query", json=payload)
    assert response.status_code == 422  # validation error

def test_metrics_summary():
    # Log a few queries
    queries = [
        {"target_job_title": "Cyber Security Specialist", "raw_text_length": 200, "semantic_weight": 0.50, "behavioral_weight": 0.50, "active_preset": "Cyber Security"},
        {"target_job_title": "Cyber Security Specialist", "raw_text_length": 300, "semantic_weight": 0.50, "behavioral_weight": 0.50, "active_preset": "Cyber Security"},
        {"target_job_title": "UX Researcher", "raw_text_length": 150, "semantic_weight": 0.70, "behavioral_weight": 0.30, "active_preset": "UX Researcher"}
    ]
    for q in queries:
        client.post("/api/log-query", json=q)
        
    response = client.get("/api/metrics-summary")
    assert response.status_code == 200
    data = response.json()
    
    # Assert properties exist in summary
    assert "total_queries_logged" in data
    assert data["total_queries_logged"] >= 4  # Includes previous test query logs
    assert "average_semantic_weight" in data
    assert "average_behavioral_weight" in data
    assert "top_searched_titles" in data
    assert "preset_distribution" in data
    assert "performance_telemetry" in data
    
    # Verify top job titles mapping
    titles = [t["title"] for t in data["top_searched_titles"]]
    assert "Cyber Security Specialist" in titles
    
    # Verify preset distribution exists
    assert "Cyber Security" in data["preset_distribution"]
    assert "UX Researcher" in data["preset_distribution"]
