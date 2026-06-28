"""
Pydantic schemas for Job Descriptions and Ranked Candidate Shortlists.

Upgraded to support raw, multi-paragraph, unstructured specifications,
flexible skill list overrides, custom WeightOverrides, and DiscoveryRequests.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.schemas.candidate import BehavioralSignals, VerificationSignals


class WeightOverride(BaseModel):
    """
    Schema for custom recruiter tuning overrides of scoring weights.
    """
    semantic_fit: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Optional override weight for semantic vector match."
    )
    behavioral_signals: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Optional override weight for behavioral telemetry signals."
    )

    model_config = ConfigDict(from_attributes=True)


class JobDescription(BaseModel):
    """
    Highly flexible schema representing a target job opportunity.
    
    Supports unstructured textual requirements, skill overrides, and custom weight configurations.
    """
    job_id: Optional[str] = Field(None, description="Unique identifier for the job posting.")
    title: Optional[str] = Field(None, description="Job title.")
    raw_text_specification: str = Field(
        ..., 
        description="Raw unstructured text description of the job (multi-paragraph job spec)."
    )
    flexible_skills_override: Optional[List[str]] = Field(
        None, 
        description="Optional explicit skill override list. If omitted, skills will be extracted automatically."
    )
    weight_tuning_override: Optional[WeightOverride] = Field(
        None,
        description="Optional custom weights tuning overrides using the WeightOverride schema."
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def validate_weight_overrides(self) -> "JobDescription":
        """
        Validates that if custom weights are provided, they sum to 1.0.
        """
        if self.weight_tuning_override is not None:
            w_sem = self.weight_tuning_override.semantic_fit
            w_beh = self.weight_tuning_override.behavioral_signals
            if w_sem is not None and w_beh is not None:
                total = w_sem + w_beh
                if not abs(total - 1.0) < 1e-6:
                    raise ValueError(
                        f"Weight overrides must sum to 1.0. Got: semantic_fit ({w_sem}) + "
                        f"behavioral_signals ({w_beh}) = {total}"
                    )
        return self


class DiscoveryRequest(BaseModel):
    """
    Discovery Request wrapper for candidate query.
    
    Contains the job posting specification and control params like blind_mode.
    Supports both nested (job_description wrapper) and flat request bodies.
    """
    job_description: Optional[JobDescription] = Field(None, description="Job posting detail and weight tuning configurations.")
    blind_mode: bool = Field(
        ...,
        description="Flag indicating if the discovery query should run in blind review mode (hiding candidate PII)."
    )
    # Flat request parameters:
    raw_text_specification: Optional[str] = Field(None, description="Raw unstructured text description of the job.")
    weight_tuning_override: Optional[WeightOverride] = Field(None, description="Optional custom weights tuning overrides.")

    model_config = ConfigDict(from_attributes=True)


class CandidateScores(BaseModel):
    """
    Represents the calculated score components returned by the ranking engine.
    """
    composite_match_percentage: float = Field(..., description="Overall match percentage (0.0 to 100.0).")
    contextual_semantic_fit: float = Field(..., description="Semantic fit score (0.0 to 1.0).")
    behavioral_signal_index: float = Field(..., description="Behavioral signal index (0.0 to 1.0).")
    experience_status: str = Field(..., description="Experience metric status (e.g. Meets Baseline, Exceeds Profile).")
    verifiability_multiplier_applied: float = Field(..., description="Verifiability multiplier (e.g. >= 1.0).")

    model_config = ConfigDict(from_attributes=True)


class RankedCandidate(BaseModel):
    """
    Representation of a candidate after scoring against a specific job requirement.
    """
    id: str = Field(..., description="Candidate ID.")
    name: str = Field(..., description="Candidate's full name.")
    current_title: str = Field(..., description="Current job title.")
    skills: List[str] = Field(..., description="Candidate skills.")
    semantic_score: float = Field(..., ge=0.0, le=1.0, description="Vector similarity matching score.")
    behavioral_score: float = Field(..., ge=0.0, le=1.0, description="Normalized behavioral heuristic score.")
    composite_score: float = Field(..., ge=0.0, le=1.0, description="Final weighted composite ranking score.")
    behavioral_signals: Optional[BehavioralSignals] = Field(None, description="Detailed behavioral telemetry signals.")
    verification_signals: Optional[VerificationSignals] = Field(None, description="Verification signals credentials check.")
    full_resume_text: Optional[str] = Field(None, description="Raw unstructured text extracted from candidate resume.")
    location: Optional[str] = Field(None, description="Candidate's location.")
    gender: Optional[str] = Field(None, description="Candidate's gender.")
    scores: Optional[CandidateScores] = Field(None, description="Detailed server-derived analytics scores.")
    reasoning: Optional[str] = Field(None, description="Dynamic explanation of candidate match and qualifications.")

    model_config = ConfigDict(from_attributes=True)


class RankedShortlistResponse(BaseModel):
    """
    Standard API response containing a list of ranked candidates for a query job.
    """
    job_id: str = Field(..., description="The query job identifier.")
    results: List[RankedCandidate] = Field(..., description="Scored and ordered list of candidates.")
    extracted_skills: Optional[List[str]] = Field(None, description="The list of target technical skills dynamically extracted or overridden.")
    mandatory_skills: Optional[List[str]] = Field(None, description="Explicit parsed mandatory skills.")
    total_candidates_evaluated: Optional[int] = Field(None, description="Total number of candidates in database evaluated.")

    model_config = ConfigDict(from_attributes=True)
