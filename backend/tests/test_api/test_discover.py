import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.vector_store import talent_store

client = TestClient(app)

def test_root_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] in ("online", "operational")

def test_discover_basic():
    # Test discover endpoint with valid payload
    payload = {
        "job_id": "job_001",
        "title": "Senior Python Developer",
        "raw_text_specification": "We are looking for a Senior Python Developer with experience in FastAPI, Docker, and AWS.",
        "flexible_skills_override": ["Python", "FastAPI", "Docker", "AWS"],
        "weight_tuning_override": None
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job_001"
    assert "results" in data
    assert len(data["results"]) > 0
    # The candidates should be ranked by composite score descending
    scores = [cand["composite_score"] for cand in data["results"]]
    assert scores == sorted(scores, reverse=True)

def test_discover_with_weight_override():
    # Custom weights
    payload = {
        "job_id": "job_002",
        "title": "Full-Stack Specialist",
        "raw_text_specification": "React, Next.js, and Node.js expertise.",
        "flexible_skills_override": None,
        "weight_tuning_override": {
            "semantic_fit": 0.70,
            "behavioral_signals": 0.30
        }
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job_002"

def test_discover_weight_override_invalid():
    # Weight overrides that do not sum to 1.0
    payload = {
        "job_id": "job_003",
        "title": "Invalid Weights",
        "raw_text_specification": "Some text",
        "weight_tuning_override": {
            "semantic_fit": 0.80,
            "behavioral_signals": 0.30  # sums to 1.1
        }
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 422  # validation error

def test_discover_cyber_security():
    payload = {
        "job_id": "job_cyber",
        "title": "Cyber Security & SecOps Specialist",
        "raw_text_specification": "Seeking a Specialist to monitor SIEM alerts, configure Firewalls, and run Pentesting against OWASP vulnerabilities.",
        "flexible_skills_override": None,
        "weight_tuning_override": None
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job_cyber"
    assert len(data["results"]) > 0
    top_candidate = data["results"][0]
    assert top_candidate["name"] == "Liam O'Connor"

def test_discover_ux_researcher():
    payload = {
        "job_id": "job_ux",
        "title": "Senior UX Researcher",
        "raw_text_specification": "We are hiring a researcher to run Usability Testing, map Personas, and design wireframes in Figma.",
        "flexible_skills_override": None,
        "weight_tuning_override": None
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job_ux"
    assert len(data["results"]) > 0
    top_candidate = data["results"][0]
    assert top_candidate["name"] == "Sophia Martinez"

def test_discover_blind_mode():
    payload = {
        "job_description": {
            "job_id": "job_blind_01",
            "title": "Senior Backend Developer",
            "raw_text_specification": "We need a Go/Python expert to work with PostgreSQL, Redis, and build clean REST APIs.",
            "flexible_skills_override": ["Go", "Python", "PostgreSQL", "Redis"],
            "weight_tuning_override": None
        },
        "blind_mode": True
    }
    response = client.post("/api/discover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job_blind_01"
    assert len(data["results"]) > 0
    for candidate in data["results"]:
        assert candidate["name"].startswith("REDACTED_NAME_")
        assert candidate["full_resume_text"] is None
        assert candidate["location"].startswith("REDACTED_LOC_")
        assert candidate["gender"].startswith("REDACTED_GEN_")


def test_add_candidate_success():
    payload = {
        "id": "cand_test_999",
        "name": "Integration Tester",
        "current_title": "Automation Engineer",
        "full_resume_text": "Experience in selenium, pytest, and postman.",
        "skills": ["Selenium", "Pytest"],
        "location": "Remote",
        "gender": "Not Disclosed",
        "verification_signals": {
            "github_verified": True,
            "portfolio_linked": False,
            "hackathon_awards_count": 0
        },
        "behavioral_signals": {
            "profile_completeness": 0.90,
            "career_velocity_score": 3.0,
            "interaction_response_rate": 0.80,
            "days_since_last_activity": 5
        }
    }
    response = client.post("/api/candidates/add", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["candidate_id"] == "cand_test_999"


def test_add_candidate_validation_error():
    # Missing required field 'name' and invalid types
    payload = {
        "id": "cand_test_888",
        "current_title": "Automation Engineer",
        "full_resume_text": "Missing name fields",
        "skills": ["Selenium"],
        "location": "Remote",
        "gender": "Not Disclosed"
    }
    response = client.post("/api/candidates/add", json=payload)
    assert response.status_code == 422  # Pydantic validation error


def test_bulk_add_and_clear_candidates():
    # 1. Clear database
    response = client.post("/api/candidates/clear")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["count"] == 0

    # 2. Bulk add candidates in the new Judges format
    bulk_payload = [
        {
            "candidate_id": "CAND_TEST_BULK_01",
            "profile": {
                "anonymized_name": "Naina Bose",
                "headline": "Business Analyst | Helping teams scale",
                "summary": "Professional with 13.5+ years of experience...",
                "location": "Gurgaon, Haryana",
                "country": "India",
                "years_of_experience": 13.5,
                "current_title": "Business Analyst",
                "current_company": "Infosys",
                "current_company_size": "10001+",
                "current_industry": "IT Services"
            },
            "career_history": [
                {
                    "company": "Infosys",
                    "title": "Business Analyst",
                    "start_date": "2022-09-15",
                    "end_date": None,
                    "duration_months": 45,
                    "is_current": True,
                    "industry": "IT Services",
                    "company_size": "10001+",
                    "description": "Led business analysis tasks."
                }
            ],
            "education": [
                {
                    "institution": "VIT Chennai",
                    "degree": "Ph.D",
                    "field_of_study": "Artificial Intelligence",
                    "start_year": 2001,
                    "end_year": 2005,
                    "grade": "6.66 CGPA",
                    "tier": "tier_3"
                }
            ],
            "skills": [
                {
                    "name": "gRPC",
                    "proficiency": "intermediate",
                    "endorsements": 9,
                    "duration_months": 11
                }
            ],
            "certifications": [],
            "languages": [],
            "redrob_signals": {
                "profile_completeness_score": 42.5,
                "signup_date": "2023-01-23",
                "last_active_date": "2025-10-22",
                "open_to_work_flag": False,
                "profile_views_received_30d": 34,
                "applications_submitted_30d": 2,
                "recruiter_response_rate": 0.42,
                "avg_response_time_hours": 108.7,
                "connection_count": 245,
                "endorsements_received": 22,
                "notice_period_days": 90,
                "expected_salary_range_inr_lpa": {
                    "min": 7.6,
                    "max": 22.9
                },
                "preferred_work_mode": "onsite",
                "willing_to_relocate": False,
                "github_activity_score": 44.7,
                "search_appearance_30d": 87,
                "saved_by_recruiters_30d": 2,
                "interview_completion_rate": 0.58,
                "offer_acceptance_rate": -1,
                "verified_email": True,
                "verified_phone": True,
                "linkedin_connected": False
            }
        }
    ]
    response = client.post("/api/candidates/bulk-add", json=bulk_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["success_count"] == 1
    assert data["error_count"] == 0

    # 3. Verify they are added by doing a discover query
    discover_payload = {
        "job_id": "job_bulk_test",
        "title": "Business Analyst",
        "raw_text_specification": "Looking for a Business Analyst with experience in gRPC.",
        "flexible_skills_override": ["gRPC"],
        "weight_tuning_override": None
    }
    response = client.post("/api/discover", json=discover_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_candidates_evaluated"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["name"] == "Naina Bose"

    # 4. Clean up / Restore seed state
    response = client.post("/api/candidates/clear?reseed=true")
    assert response.status_code == 200
    assert response.json()["count"] == 9


def test_upload_jsonl_file():
    # 1. Clear database
    response = client.post("/api/candidates/clear")
    assert response.status_code == 200

    # 2. Build mock JSONL string
    jsonl_content = (
        '{"candidate_id": "CAND_JSONL_01", "profile": {"anonymized_name": "Siddharth Dev", "headline": "React Engineer", "summary": "Senior developer", "location": "Bangalore", "country": "India", "years_of_experience": 5, "current_title": "React Engineer", "current_company": "Google", "current_company_size": "10001+", "current_industry": "Tech"}}\n'
        '{"candidate_id": "CAND_JSONL_02", "profile": {"anonymized_name": "Ananya Sen", "headline": "FastAPI Architect", "summary": "Python backend lead", "location": "Kolkata", "country": "India", "years_of_experience": 8, "current_title": "FastAPI Architect", "current_company": "Meta", "current_company_size": "10001+", "current_industry": "Tech"}}'
    )

    # 3. Post as files
    files = {"file": ("test_candidates.jsonl", jsonl_content.encode("utf-8"), "application/jsonl")}
    response = client.post("/api/candidates/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["success_count"] == 2
    assert data["error_count"] == 0

    # 4. Verify candidate count is correct in discover
    discover_payload = {
        "job_id": "job_jsonl_test",
        "title": "React Engineer",
        "raw_text_specification": "React and TypeScript development experience.",
        "flexible_skills_override": ["React"],
        "weight_tuning_override": None
    }
    response = client.post("/api/discover", json=discover_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total_candidates_evaluated"] == 2
    assert len(res_data["results"]) == 2

    # 5. Clean up / Restore seed state
    response = client.post("/api/candidates/clear?reseed=true")
    assert response.status_code == 200


def test_redrob_founding_engineer_pipeline():
    # 1. Clear database
    response = client.post("/api/candidates/clear")
    assert response.status_code == 200

    # 2. Add candidates (one fit, one consulting firm disqualified)
    bulk_payload = [
        {
            # Candidate A: Strong Fit
            "candidate_id": "CAND_FIT_01",
            "profile": {
                "anonymized_name": "Shipper Engineer",
                "headline": "Senior AI Engineer",
                "summary": "Built embeddings recommendation search at a product startup. production deployment.",
                "location": "Pune",
                "country": "India",
                "years_of_experience": 7.0,
                "current_title": "Senior AI Engineer",
                "current_company": "Startup Inc",
                "current_company_size": "11-50",
                "current_industry": "Tech"
            },
            "skills": [{"name": "python"}, {"name": "embeddings"}, {"name": "retrieval"}, {"name": "vector database"}],
            "redrob_signals": {
                "profile_completeness_score": 90,
                "signup_date": "2025-01-01",
                "last_active_date": "2026-06-20",
                "recruiter_response_rate": 85
            }
        },
        {
            # Candidate B: Consulting Firm Disqualified
            "candidate_id": "CAND_DISQ_CONSULTING",
            "profile": {
                "anonymized_name": "Consultant Dev",
                "headline": "AI Specialist",
                "summary": "AI Specialist at Infosys. Consulting projects.",
                "location": "Pune",
                "country": "India",
                "years_of_experience": 7.0,
                "current_title": "AI Specialist",
                "current_company": "Infosys",
                "current_company_size": "10001+",
                "current_industry": "IT Services"
            },
            "career_history": [
                {
                    "company": "Infosys",
                    "title": "AI Specialist",
                    "description": "Consulting work for various clients."
                }
            ],
            "skills": [{"name": "python"}, {"name": "embeddings"}, {"name": "retrieval"}],
            "redrob_signals": {
                "profile_completeness_score": 90,
                "signup_date": "2025-01-01",
                "last_active_date": "2026-06-20",
                "recruiter_response_rate": 85
            }
        }
    ]
    
    response = client.post("/api/candidates/bulk-add", json=bulk_payload)
    assert response.status_code == 201

    # 3. Call dedicated Redrob ranking endpoint
    response = client.post("/api/discover/redrob-founding-engineer")
    assert response.status_code == 200
    data = response.json()
    assert data["total_candidates_evaluated"] == 2
    assert len(data["results"]) == 2
    
    # Candidate A should be ranked #1 and have a much higher score than Candidate B (disqualified)
    assert data["results"][0]["id"] == "CAND_FIT_01"
    assert data["results"][0]["composite_score"] > data["results"][1]["composite_score"] * 5

    # 4. Clean up / Restore seed state
    response = client.post("/api/candidates/clear?reseed=true")
    assert response.status_code == 200

