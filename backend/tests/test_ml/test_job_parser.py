import pytest
from app.services.job_parser import UnstructuredJobParser

@pytest.fixture
def parser():
    return UnstructuredJobParser()

def test_extract_experience_requirement_range(parser):
    # Tests ranges like "3-5 years" and returns the highest integer
    text = "We are seeking a developer with 3-5 years of experience."
    assert parser.extract_experience_requirement(text) == 5

def test_extract_experience_requirement_suffix(parser):
    # Tests suffix matches like "5+ years"
    text = "Requires 5+ years of software design."
    assert parser.extract_experience_requirement(text) == 5

    text_alt = "Needs 4+ yrs of frontend development."
    assert parser.extract_experience_requirement(text_alt) == 4

def test_extract_experience_requirement_prefix(parser):
    # Tests prefix phrase matching like "experience of 7 years"
    text = "Must have an experience of 7 years in backend systems."
    assert parser.extract_experience_requirement(text) == 7

    text_alt = "Minimum of 2 years experience required."
    assert parser.extract_experience_requirement(text_alt) == 2

def test_extract_experience_requirement_highest(parser):
    # Tests multiple mentions and returns the highest integer
    text = "Candidates with 3-5 years of React experience and 8+ years of Java are preferred."
    assert parser.extract_experience_requirement(text) == 8

def test_extract_experience_requirement_default(parser):
    # Tests default behavior when no experience is specified
    text = "This is a graduate position, open to anyone with passion for coding."
    assert parser.extract_experience_requirement(text) == 0

    assert parser.extract_experience_requirement("") == 0
    assert parser.extract_experience_requirement(None) == 0

def test_extract_technical_skills_clean(parser):
    # Tests token cleaning, lowercasing, and matching
    text = "We use Python, React.JS, and KUBERNETES in our daily workflow."
    skills = parser.extract_technical_skills(text)
    assert "python" in skills
    assert "react.js" in skills
    assert "kubernetes" in skills
    assert len(skills) == 3

def test_extract_technical_skills_filtering(parser):
    # Tests that unrelated words are filtered out
    text = "Our office has a new desk, chair, and coffee machine."
    assert parser.extract_technical_skills(text) == []

def test_extract_technical_skills_uniqueness(parser):
    # Tests that duplicates are removed
    text = "We need python experts. python is key. Also java."
    skills = parser.extract_technical_skills(text)
    assert skills == ["python", "java"]

def test_extract_technical_skills_punctuation(parser):
    # Tests handling punctuation formatting noise
    text = "Skills required: fastAPI, Docker, AWS! Also SQL; Git."
    skills = parser.extract_technical_skills(text)
    # fastAPI, docker, aws, sql should be extracted.
    assert "fastapi" in skills
    assert "docker" in skills
    assert "aws" in skills
    assert "sql" in skills

def test_parse_job_specification(parser):
    # Tests the complete unified parser output structure and content
    text = """Senior Python Developer
    We are looking for a Senior Python Developer with 5+ years of experience.
    Must have hands-on experience with FastAPI, Docker, and AWS.
    """
    payload = parser.parse_job_specification(text)
    assert isinstance(payload, dict)
    assert "extracted_title_keywords" in payload
    assert "required_experience_years" in payload
    assert "mandatory_skills" in payload

    assert "senior" in payload["extracted_title_keywords"]
    assert "developer" in payload["extracted_title_keywords"]
    assert payload["required_experience_years"] == 5
    assert "python" in payload["mandatory_skills"]
    assert "fastapi" in payload["mandatory_skills"]
    assert "docker" in payload["mandatory_skills"]
    assert "aws" in payload["mandatory_skills"]
