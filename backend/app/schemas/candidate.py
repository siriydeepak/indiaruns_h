"""
Pydantic schemas for Candidate Profiles and associated signals.

These schemas define validation constraints for candidate profile records, including
verification indicators and behavioral telemetry markers.
"""

from typing import List
from pydantic import BaseModel, Field, ConfigDict


class VerificationSignals(BaseModel):
    """
    Model representing platform verification checkpoints and achievements.
    """
    github_verified: bool = Field(
        ...,
        description="Indicates if the candidate's GitHub profile is verified."
    )
    portfolio_linked: bool = Field(
        ...,
        description="Indicates if a valid personal portfolio website has been linked."
    )
    hackathon_awards_count: int = Field(
        ...,
        ge=0,
        description="Total number of hackathon awards or community achievements."
    )

    model_config = ConfigDict(from_attributes=True)


class BehavioralSignals(BaseModel):
    """
    Model representing historical and behavioral telemetry signals for a candidate.
    
    These values are evaluated by the heuristic ranking engine to compute the overall
    profile strength and response velocity scores.
    """
    profile_completeness: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Completeness of the candidate's profile (0.0 to 1.0)."
    )
    career_velocity_score: float = Field(
        ..., 
        ge=1.0, 
        le=5.0, 
        description="Speed of candidate career progression (1.0 = Slow, 5.0 = Rocket ship)."
    )
    interaction_response_rate: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Recruiter/employer response rate from the candidate (0.0 to 1.0)."
    )
    days_since_last_activity: int = Field(
        ..., 
        ge=0, 
        description="Number of days since candidate was last active on the platform."
    )

    model_config = ConfigDict(from_attributes=True)


class CandidateProfile(BaseModel):
    """
    Unified Candidate Profile data schema.
    
    Includes professional credentials, unstructured resume text, verification badges,
    and structural behavioral telemetry signals.
    """
    id: str = Field(..., description="Unique identifier for the candidate.")
    name: str = Field(..., description="Candidate's full name.")
    current_title: str = Field(..., description="Candidate's current professional job title.")
    full_resume_text: str = Field(..., description="Raw unstructured text extracted from the candidate resume/CV.")
    skills: List[str] = Field(default_factory=list, description="List of explicit technical skills extracted or declared.")
    location: str = Field(..., description="Candidate's geographic location.")
    gender: str = Field(..., description="Candidate's self-disclosed gender or preference indicator.")
    verification_signals: VerificationSignals = Field(..., description="Credentials check verification details.")
    behavioral_signals: BehavioralSignals = Field(..., description="Nested behavioral activity signals.")

    model_config = ConfigDict(from_attributes=True)
