"""
FastAPI Controller for Candidate Discovery and Scoring.

Exposes endpoints for ranking candidates against target job descriptions using 
semantic search and behavioral analytics, performing vector calculations explicitly
inside the endpoint logic.
"""

import time
import logging
import json
from typing import Dict, Any, List, Union
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File

from app.schemas.candidate import CandidateProfile
from app.schemas.job import DiscoveryRequest, JobDescription, RankedShortlistResponse, RankedCandidate
from app.core.vector_store import talent_store
from app.services.ranking_engine import IntelligentRankingEngine, get_ranking_engine
from app.services.job_parser import UnstructuredJobParser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/candidates/add",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add a new candidate profile to the talent store",
    description="Registers a new candidate profile dynamically into the in-memory talent store."
)
async def add_candidate_profile(
    candidate: CandidateProfile
) -> Dict[str, Any]:
    """
    Ingests a custom candidate profile into the search engine's in-memory memory cache.
    """
    logger.info(f"Ingesting new candidate profile: {candidate.name} - Title: {candidate.current_title}")
    try:
        # Thread-safe database injection
        talent_store.add_candidate(candidate)
        
        # System log detailing the unique candidate ID added
        logger.info(f"Successfully added candidate profile to DB. Candidate ID: {candidate.id}")
        
        # Confirmation Handshake Delivery
        return {
            "status": "success",
            "message": "Candidate profile successfully parsed and indexed into talent pool",
            "candidate_id": candidate.id
        }
    except Exception as e:
        logger.error(f"Critical failure during candidate profile ingestion logic: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed candidate profile data packet"
        )


def map_judges_candidate_to_profile(data: Dict[str, Any]) -> CandidateProfile:
    # Extract ID
    cand_id = data.get("candidate_id") or data.get("id") or f"cand_{int(time.time() * 1000)}"
    
    # Extract profile details
    profile = data.get("profile") or {}
    name = profile.get("anonymized_name") or data.get("name") or "Anonymized Candidate"
    current_title = profile.get("current_title") or data.get("current_title") or "Software Engineer"
    location = profile.get("location") or data.get("location") or "Remote"
    gender = data.get("gender") or "Not Disclosed"
    
    # Skills mapping
    raw_skills = data.get("skills") or []
    skills = []
    for s in raw_skills:
        if isinstance(s, dict):
            skills.append(s.get("name", ""))
        elif isinstance(s, str):
            skills.append(s)
    skills = [s for s in skills if s]
    if not skills and data.get("skills"):
        skills = data.get("skills")

    # Reconstruct full resume text
    summary = profile.get("summary") or ""
    headline = profile.get("headline") or ""
    
    career_history = data.get("career_history") or []
    experience_parts = []
    for job in career_history:
        company = job.get("company") or ""
        title = job.get("title") or ""
        desc = job.get("description") or ""
        experience_parts.append(f"- {title} at {company}: {desc}")
    
    education = data.get("education") or []
    education_parts = []
    for edu in education:
        inst = edu.get("institution") or ""
        deg = edu.get("degree") or ""
        field = edu.get("field_of_study") or ""
        education_parts.append(f"- {deg} in {field} from {inst}")
        
    full_resume_text = f"{name} - {current_title}\nHeadline: {headline}\nSummary: {summary}\n\nExperience:\n" + "\n".join(experience_parts) + "\n\nEducation:\n" + "\n".join(education_parts)
    
    # Verification signals
    redrob = data.get("redrob_signals") or {}
    github_score = redrob.get("github_activity_score", 0)
    github_verified = github_score > 0
    portfolio_linked = redrob.get("linkedin_connected", False) or redrob.get("verified_email", False)
    hackathon_awards_count = int(redrob.get("endorsements_received", 0) // 10)
    
    # Behavioral signals
    completeness = redrob.get("profile_completeness_score", 85.0)
    if completeness > 1.0:
        completeness = completeness / 100.0
    
    conn_count = redrob.get("connection_count", 100)
    velocity = 1.0 + (min(conn_count, 1000) / 1000.0) * 4.0
    
    response_rate = redrob.get("recruiter_response_rate", 0.90)
    if response_rate > 1.0:
        response_rate = response_rate / 100.0
        
    from datetime import datetime
    last_active_str = redrob.get("last_active_date")
    days_since_active = 1
    if last_active_str:
        try:
            last_active_dt = datetime.strptime(last_active_str.split("T")[0], "%Y-%m-%d")
            current_dt = datetime(2026, 6, 28)
            days_since_active = max(1, (current_dt - last_active_dt).days)
        except Exception:
            days_since_active = 1
        
    return CandidateProfile(
        id=cand_id,
        name=name,
        current_title=current_title,
        full_resume_text=full_resume_text,
        skills=skills,
        location=location,
        gender=gender,
        verification_signals={
            "github_verified": github_verified,
            "portfolio_linked": portfolio_linked,
            "hackathon_awards_count": hackathon_awards_count
        },
        behavioral_signals={
            "profile_completeness": completeness,
            "career_velocity_score": velocity,
            "interaction_response_rate": response_rate,
            "days_since_last_activity": days_since_active
        }
    )


@router.post(
    "/candidates/bulk-add",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk ingest candidate profiles",
    description="Bulk registers candidate profiles (supporting multiple schemas) into the memory talent store."
)
async def bulk_add_candidate_profiles(
    candidates_data: List[Dict[str, Any]] = Body(...)
) -> Dict[str, Any]:
    """
    Ingests a list of custom candidate profiles in batch.
    """
    logger.info(f"Ingesting {len(candidates_data)} candidate profiles in bulk...")
    success_count = 0
    error_count = 0
    errors = []
    
    for idx, cand_data in enumerate(candidates_data):
        try:
            if "candidate_id" in cand_data or "profile" in cand_data:
                profile_model = map_judges_candidate_to_profile(cand_data)
            else:
                profile_model = CandidateProfile(**cand_data)
            
            talent_store.add_candidate(profile_model)
            success_count += 1
        except Exception as e:
            error_count += 1
            if len(errors) < 5:
                errors.append(f"Index {idx}: {str(e)}")
                
    logger.info(f"Bulk ingestion complete: {success_count} success, {error_count} errors")
    
    return {
        "status": "success",
        "message": f"Successfully ingested {success_count} profiles. Errors: {error_count}",
        "success_count": success_count,
        "error_count": error_count,
        "errors_sample": errors
    }


@router.post(
    "/candidates/clear",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Clear all candidates from the talent store",
    description="Wipes the in-memory talent store and optionally re-seeds the default 9 mock profiles."
)
async def clear_talent_store(
    reseed: bool = False
) -> Dict[str, Any]:
    """
    Wipes the active candidate database and optionally re-seeds default mock profiles.
    """
    logger.warning("Clearing memory database registry...")
    talent_store.clear()
    
    message = "Talent pool cleared successfully"
    if reseed:
        talent_store.seed_initial_profiles()
        message += " and re-seeded with default profiles"
        
    return {
        "status": "success",
        "message": message,
        "count": len(talent_store.get_all_candidates())
    }


@router.post(
    "/candidates/upload",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a JSON or JSONL candidate file",
    description="Reads a candidate dataset from file (.json or .jsonl) using streaming to handle 200,000+ records safely."
)
async def upload_candidate_dataset(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    filename = file.filename or ""
    logger.info(f"Ingesting file upload: {filename}")
    
    success_count = 0
    error_count = 0
    
    try:
        if filename.endswith(".jsonl"):
            from app.pipelines.ingestion import execute_document_constraints_pipeline
            # Pass the file stream directly to the generator pipeline
            for candidate in execute_document_constraints_pipeline(file.file):
                talent_store.add_candidate(candidate)
                success_count += 1
        else:
            # Read JSON content
            content = await file.read()
            data = json.loads(content)
            candidates_list = data if isinstance(data, list) else [data]
            
            for cand_data in candidates_list:
                try:
                    if "candidate_id" in cand_data or "profile" in cand_data:
                        profile_model = map_judges_candidate_to_profile(cand_data)
                    else:
                        profile_model = CandidateProfile(**cand_data)
                    talent_store.add_candidate(profile_model)
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    
        logger.info(f"Ingestion complete for file {filename}: {success_count} success, {error_count} errors")
        return {
            "status": "success",
            "message": f"Successfully ingested {success_count} profiles. Errors: {error_count}",
            "success_count": success_count,
            "error_count": error_count
        }
    except Exception as e:
        logger.error(f"Critical error during file upload processing: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process file: {str(e)}"
        )


@router.post(
    "/discover/redrob-founding-engineer",
    response_model=RankedShortlistResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank candidates specifically for the Redrob Founding AI Engineer role",
    description="Evaluates all active candidates against the Redrob Founding Team JD, applying hackathon constraint penalties."
)
async def discover_redrob_founding_engineer(
    blind_mode: bool = False,
    engine: IntelligentRankingEngine = Depends(get_ranking_engine)
) -> RankedShortlistResponse:
    """
    Candidate discovery gateway dedicated to ranking candidates against the Founding Team JD.
    """
    logger.info("Starting candidate matching pipeline for Redrob Founding AI Engineer role...")
    
    candidates = talent_store.get_all_candidates()
    
    # Run specialized founding team ranker
    results = engine.rank_redrob_founding_engineer(candidates, blind_mode=blind_mode)
    
    # Map back to RankedCandidate models
    ranked_candidates = []
    for r in results:
        ranked_candidates.append(RankedCandidate(**r))
        
    return RankedShortlistResponse(
        job_id="redrob-founding-engineer",
        results=ranked_candidates,
        extracted_skills=["embeddings", "retrieval", "ranking", "vector databases", "python", "evaluation"],
        mandatory_skills=["embeddings", "retrieval", "ranking", "vector databases", "python", "evaluation"],
        total_candidates_evaluated=len(candidates)
    )


@router.post(
    "/discover",
    response_model=RankedShortlistResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank candidates against a job description",
    description=(
        "Retrieves all candidate profiles from the vector store, calculates "
        "semantic fit and behavioral telemetry matching, and returns a prioritized list "
        "of ranked candidates."
    )
)
async def discover_and_rank_candidates(
    payload: Union[DiscoveryRequest, JobDescription] = Body(...),
    engine: IntelligentRankingEngine = Depends(get_ranking_engine)
) -> RankedShortlistResponse:
    """
    Discovery endpoint. Accepts either a DiscoveryRequest wrapper or a raw JobDescription,
    extracts job details and blind_mode settings, runs local vector scoring, and returns rankings.
    """
    start_time = time.perf_counter()

    # Extract fields from union payload
    if isinstance(payload, DiscoveryRequest):
        if payload.job_description is not None:
            job = payload.job_description
        else:
            job = JobDescription(
                job_id=f"job_spec_{int(time.time())}",
                title="Search Query",
                raw_text_specification=payload.raw_text_specification or "",
                flexible_skills_override=None,
                weight_tuning_override=payload.weight_tuning_override
            )
        blind_mode = payload.blind_mode
    else:
        job = payload
        blind_mode = False

    logger.info(
        f"Starting candidate matching pipeline for Job ID: {job.job_id} ('{job.title}') "
        f"- blind_mode={blind_mode}"
    )

    try:
        # 1. Parse job spec using UnstructuredJobParser
        parser = UnstructuredJobParser()
        parsed_job = parser.parse_job_specification(job.raw_text_specification or "")
        required_experience_years = parsed_job.get("required_experience_years", 0)
        mandatory_skills = parsed_job.get("mandatory_skills", [])

        logger.info(
            f"Parsed job spec - Experience requirement: {required_experience_years} years. "
            f"Mandatory skills: {mandatory_skills}"
        )

        # 2. Fetch candidates from the singleton InMemoryTalentStore
        candidates = talent_store.get_all_candidates()
        if not candidates:
            logger.warning("InMemoryTalentStore database is empty.")
            return RankedShortlistResponse(job_id=job.job_id, results=[], extracted_skills=mandatory_skills)

        # 3. Run ranking calculations inside the engine with parsed constraints
        ranked_results = engine.rank_candidates(
            job=job,
            candidates=candidates,
            blind_mode=blind_mode,
            required_experience_years=required_experience_years,
            mandatory_skills=mandatory_skills
        )

        # 4. Parse candidates into serialized response format
        ranked_candidates = [
            RankedCandidate(**cand_data) for cand_data in ranked_results
        ]

        # 5. Resolve extracted technical skills (either overridden or dynamically parsed)
        if job.flexible_skills_override is not None:
            extracted_skills = job.flexible_skills_override
        else:
            extracted_skills = mandatory_skills

        execution_time = (time.perf_counter() - start_time) * 1000.0
        logger.info(
            f"Successfully processed {len(candidates)} candidates for Job ID {job.job_id} "
            f"in {execution_time:.2f}ms"
        )
        if execution_time > 200.0:
            logger.warning(f"SLA breached: Execution time {execution_time:.2f}ms exceeded 200ms limit")

        return RankedShortlistResponse(
            job_id=job.job_id,
            results=ranked_candidates,
            extracted_skills=extracted_skills,
            mandatory_skills=mandatory_skills,
            total_candidates_evaluated=len(candidates)
        )

    except Exception as e:
        logger.error(f"Error executing vector discovery endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while matching and ranking candidates: {str(e)}"
        )
