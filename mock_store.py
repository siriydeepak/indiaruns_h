from pydantic import BaseModel
from typing import List, Dict

# --- Pydantic Schemas (The Interface Contract) ---
class CandidateRank(BaseModel):
    rank: int
    candidate_id: str
    name: str
    fit_score: int
    skills_matched: List[str]

class ShapExplanation(BaseModel):
    candidate_id: str
    name: str
    features: List[str]
    shap_values: List[float]
    summary: str
    counterfactual: str

class BiasFeatureFlag(BaseModel):
    feature: str
    impact: str

class BiasReport(BaseModel):
    disparate_impact_before: float
    disparate_impact_after: float
    flagged_features: List[BiasFeatureFlag]
    interpretation: str

# --- Gold Standard Production Mock Data ---
MOCK_RANK_DATA: List[CandidateRank] = [
    CandidateRank(rank=1, candidate_id="cand_001", name="Arjun Sharma", fit_score=94, skills_matched=["Python", "React", "Docker", "Machine Learning", "FastAPI"]),
    CandidateRank(rank=2, candidate_id="cand_002", name="Sarah Jenkins", fit_score=89, skills_matched=["Python", "SQL", "Flask", "Pandas", "Scikit-Learn"]),
    CandidateRank(rank=3, candidate_id="cand_003", name="Michael Chang", fit_score=85, skills_matched=["JavaScript", "React", "HTML/CSS", "Node.js", "Python"]),
    CandidateRank(rank=4, candidate_id="cand_004", name="Priya Patel", fit_score=78, skills_matched=["Python", "Data Visualization", "SQL", "Tableau"]),
    CandidateRank(rank=5, candidate_id="cand_005", name="David Kim", fit_score=72, skills_matched=["Java", "Spring Boot", "SQL", "Docker", "Python"])
]

MOCK_EXPLAIN_DATA: Dict[str, ShapExplanation] = {
    "cand_001": ShapExplanation(
        candidate_id="cand_001",
        name="Arjun Sharma",
        features=["Core Skills Match", "Years of Experience", "Project Alignment", "Notice Period Match", "Missing Requirement (Kubernetes)"],
        shap_values=[0.45, 0.35, 0.20, 0.10, -0.25],
        summary="Arjun was ranked #1 primarily due to an exceptional core skills alignment and solid domain experience, though a lack of Kubernetes experience slightly dampened his optimal score.",
        counterfactual="Add 6 months of Kubernetes hands-on experience → absolute alignment score jumps to 98% (🔒 Locks #1 Rank)."
    ),
    "cand_002": ShapExplanation(
        candidate_id="cand_002",
        name="Sarah Jenkins",
        features=["Core Skills Match", "Years of Experience", "Pandas/Scikit proficiency", "Missing React Knowledge"],
        shap_values=[0.40, 0.38, 0.25, -0.14],
        summary="Sarah scores exceptionally high on core predictive engineering layers but lost minor scaling metrics on full-stack versatility requests.",
        counterfactual="Acquire basic structural React composition → baseline affinity scales up +7%."
    )
}

MOCK_BIAS_DATA = BiasReport(
    disparate_impact_before=0.60,
    disparate_impact_after=0.92,
    flagged_features=[
        BiasFeatureFlag(feature="college_tier", impact="Candidates from Tier-2 colleges were 40% less likely to be shortlisted before baseline calibration."),
        BiasFeatureFlag(feature="city_tier", impact="Non-metropolitan geographic markers caused an uncalibrated 12% drop in pipeline flow.")
    ],
    interpretation="Candidates from tier-2 colleges were 40% less likely to be shortlisted before debiasing. After proxy variable mitigation: only an 8% variance remains."
)
