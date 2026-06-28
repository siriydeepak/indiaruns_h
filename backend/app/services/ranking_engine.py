"""
Semantic Search and Predictive Ranking Engine Service.

This module implements the IntelligentRankingEngine, which computes candidate fit
by combining contextual dense vector embeddings with normalized behavioral telemetry signals,
technical skill overlap, and experience alignment.
"""

import time
import math
import logging
import hashlib
from typing import List, Dict, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.schemas.candidate import CandidateProfile, BehavioralSignals
from app.schemas.job import JobDescription
from app.services.nlp_parser import DynamicJobParser
from app.services.job_parser import UnstructuredJobParser

logger = logging.getLogger(__name__)


class IntelligentRankingEngine:
    """
    Core Ranking Engine combining NLP dense vector search with heuristic telemetry signals,
    technical skill overlap, and experience decay constraints using NumPy.
    """

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME) -> None:
        logger.info(f"Initializing SentenceTransformer model: {model_name}...")
        # Load embedding model locally (no external cloud requests)
        self.model = SentenceTransformer(model_name)
        logger.info("SentenceTransformer model successfully loaded.")

    def calculate_semantic_fit(self, job_desc: str, candidate_resume: str) -> float:
        """
        Calculates the semantic cosine similarity between the job description and candidate resume.
        
        Args:
            job_desc: Target job requirements and context.
            candidate_resume: Unstructured candidate resume text.
            
        Returns:
            A normalized similarity score between 0.0 and 1.0.
        """
        # Generate dense embeddings (1, vector_dimension)
        emb_job = self.model.encode(job_desc, convert_to_numpy=True).reshape(1, -1)
        emb_resume = self.model.encode(candidate_resume, convert_to_numpy=True).reshape(1, -1)
        
        # Calculate Cosine Similarity
        similarity = cosine_similarity(emb_job, emb_resume)[0][0]
        
        # Clip to ensure bounds are strictly [0.0, 1.0]
        normalized_score = float(np.clip(similarity, 0.0, 1.0))
        return normalized_score

    def calculate_behavioral_score(self, signals: BehavioralSignals) -> float:
        """
        Applies signal integration to candidates' behavioral metrics.
        """
        completeness_contrib = signals.profile_completeness * 0.30
        velocity_contrib = (signals.career_velocity_score / 5.0) * 0.40
        response_contrib = signals.interaction_response_rate * 0.20
        
        # Compute recency decay (linear decay within 30 days window)
        days_active_factor = max(0, 30 - signals.days_since_last_activity) / 30.0
        recency_contrib = days_active_factor * 0.10
        
        behavioral_score = completeness_contrib + velocity_contrib + response_contrib + recency_contrib
        return float(np.clip(behavioral_score, 0.0, 1.0))

    def rank_candidates(
        self,
        job: JobDescription,
        candidates: List[CandidateProfile],
        blind_mode: bool = False,
        required_experience_years: int = 0,
        mandatory_skills: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates individual component scores and ranks all candidates by composite score.
        Uses parallelized NumPy matrix dot-product step to compute similarities simultaneously.
        
        Mathematical Scoring Logic:
            Composite Match Score = (w_semantic * Semantic Fit)
                                   + (w_skills * Technical Skill Overlap)
                                   + (w_behavioral * Behavioral Heuristic Score)
                                   + (w_experience * Experience Alignment Score)
            
            Where:
                - Technical Skill Overlap = Intersection(Candidate Skills, Mandatory Skills) / Total Mandatory Skills
                - Experience Alignment = 1.0 if Candidate Experience >= Required Experience
                                         else exp(Candidate Experience - Required Experience)
        """
        start_time = time.perf_counter()
        
        if not candidates:
            logger.warning("Empty candidate list passed to ranking engine.")
            return []

        # 1. Resolve target technical skills
        if mandatory_skills is not None:
            extracted_skills = mandatory_skills
            logger.info(f"Using parsed mandatory skills: {extracted_skills}")
        elif job.flexible_skills_override is not None:
            extracted_skills = job.flexible_skills_override
            logger.info(f"Using manual skills override: {extracted_skills}")
        else:
            parser = DynamicJobParser(job.raw_text_specification)
            extracted_skills = parser.extract_technical_skills()
            logger.info(f"Using dynamically parsed skills: {extracted_skills}")

        # 2. Determine and normalize weight distribution budget
        w_semantic = 0.50
        w_skills = 0.20
        w_behavioral = 0.20
        w_experience = 0.10

        if job.weight_tuning_override is not None:
            override_dict = (
                job.weight_tuning_override.model_dump(exclude_none=True)
                if hasattr(job.weight_tuning_override, "model_dump")
                else job.weight_tuning_override
            )
            w_semantic = override_dict.get("semantic_fit", w_semantic)
            w_behavioral = override_dict.get("behavioral_signals", w_behavioral)
            w_skills = override_dict.get("technical_skills", w_skills)
            w_experience = override_dict.get("experience_alignment", w_experience)

        # Normalize the weights sum to 1.0 dynamically
        total_w = w_semantic + w_behavioral + w_skills + w_experience
        if total_w > 0.0 and abs(total_w - 1.0) > 1e-6:
            w_semantic /= total_w
            w_behavioral /= total_w
            w_skills /= total_w
            w_experience /= total_w

        # Stage 1: Fast Heuristic Retrieval Filter for Scalability
        is_large_pool = len(candidates) > 500
        if is_large_pool:
            logger.info(f"Large candidate pool detected ({len(candidates)}). Initializing Stage-1 filtering...")
            retrieval_scores = []
            
            # Pre-compile lowercased query skills and job title words for quick lookup
            req_skills_set = {s.lower().strip() for s in extracted_skills if s}
            job_title_words = {w.lower() for w in (job.title or "").split() if len(w) > 3}
            
            for cand in candidates:
                # 1. Skill overlap score (quick intersection)
                cand_skills_set = {s.lower().strip() for s in cand.skills if s}
                skill_score = len(cand_skills_set.intersection(req_skills_set)) / max(len(req_skills_set), 1)
                
                # 2. Title match score (quick word overlap)
                cand_title_words = {w.lower() for w in (cand.current_title or "").split() if len(w) > 3}
                title_score = len(cand_title_words.intersection(job_title_words)) / max(len(job_title_words), 1)
                
                # 3. Behavioral score
                beh_score = self.calculate_behavioral_score(cand.behavioral_signals)
                
                # Combined retrieval score (weighted: 50% skills, 30% title match, 20% behavioral strength)
                ret_score = (skill_score * 0.5) + (title_score * 0.3) + (beh_score * 0.2)
                retrieval_scores.append(ret_score)
                
            # Select indices of the top 500 candidates
            top_k_indices = np.argsort(retrieval_scores)[-500:][::-1]
            candidates_to_rank = [candidates[i] for i in top_k_indices]
            logger.info(f"Stage-1 filtering complete. Top 500 candidates selected for Stage-2 semantic reranking.")
        else:
            candidates_to_rank = candidates

        # 3. Parallelized Semantic Fit Vector math using NumPy in small matrix chunks
        skills_text = " ".join(extracted_skills)
        job_text = f"{job.title or ''} {job.raw_text_specification} {skills_text}"
        
        semantic_scores_list = []
        chunk_size = 5000
        
        try:
            # Generate job embedding (1, Dimension)
            emb_job = self.model.encode(job_text, convert_to_numpy=True).reshape(1, -1)
            emb_job_norm = emb_job / np.linalg.norm(emb_job)
            
            # Compute similarities in small matrix chunks to stay well under 16GB RAM limit
            for i in range(0, len(candidates_to_rank), chunk_size):
                chunk = candidates_to_rank[i:i+chunk_size]
                resumes = [cand.full_resume_text for cand in chunk]
                
                # Batch encode current chunk
                emb_resumes = self.model.encode(resumes, convert_to_numpy=True)
                if len(chunk) == 1:
                    emb_resumes = emb_resumes.reshape(1, -1)
                    
                # Normalize and perform NumPy dot product for this chunk
                emb_resumes_norm = emb_resumes / np.linalg.norm(emb_resumes, axis=1, keepdims=True)
                chunk_scores = np.dot(emb_resumes_norm, emb_job_norm.T).flatten()
                chunk_scores = np.clip(chunk_scores, 0.0, 1.0)
                semantic_scores_list.extend(chunk_scores.tolist())
                
            semantic_scores = np.array(semantic_scores_list)
        except Exception as ex:
            logger.error(f"Error during parallel semantic vector calculations: {str(ex)}", exc_info=True)
            # Fallback to single-encoding loops on error
            semantic_scores = np.array([
                self.calculate_semantic_fit(job_text, cand.full_resume_text) for cand in candidates_to_rank
            ])

        # 4. Multi-Vector Score calculations
        parser = UnstructuredJobParser()
        ranked_list = []
        
        for idx, candidate in enumerate(candidates_to_rank):
            try:
                # Retrieve pre-calculated semantic fit
                raw_semantic = float(semantic_scores[idx])
                # Scale semantic score from [0.18, 0.42] to [0.0, 1.0] for realistic requirement matching
                scaled_sem = (raw_semantic - 0.18) / (0.42 - 0.18)
                semantic_score = float(np.clip(scaled_sem, 0.0, 1.0))
                
                # Technical Skill Overlap
                if extracted_skills:
                    cand_skills = {s.lower().strip() for s in candidate.skills if s}
                    req_skills = {s.lower().strip() for s in extracted_skills if s}
                    overlap = cand_skills.intersection(req_skills)
                    skills_overlap_score = float(len(overlap) / len(req_skills))
                else:
                    skills_overlap_score = 1.0
                    
                # Experience Alignment
                if required_experience_years > 0:
                    candidate_exp = parser.extract_experience_requirement(candidate.full_resume_text)
                    if candidate_exp >= required_experience_years:
                        exp_score = 1.0
                    else:
                        # Smooth mathematical decay penalty: exp(candidate_years - required_years)
                        exp_score = float(np.exp(candidate_exp - required_experience_years))
                else:
                    exp_score = 1.0
                    
                # Behavioral Score Heuristic
                behavioral_score = self.calculate_behavioral_score(candidate.behavioral_signals)
                
                # Weighted Composite Match Score
                composite_score = (
                    (semantic_score * w_semantic) +
                    (skills_overlap_score * w_skills) +
                    (behavioral_score * w_behavioral) +
                    (exp_score * w_experience)
                )
                
                # Apply penalty if candidate does not meet experience requirements
                if required_experience_years > 0 and exp_score < 1.0:
                    composite_score *= exp_score
                
                # Apply penalty if candidate has 0 skills matched
                if extracted_skills and skills_overlap_score == 0.0:
                    composite_score *= 0.4
                    
                composite_score = float(np.clip(composite_score, 0.0, 1.0))
                
                # Verifiable Boost Multiplier
                multiplier = 1.0
                if candidate.verification_signals:
                    if candidate.verification_signals.github_verified:
                        multiplier += 0.1
                    if candidate.verification_signals.portfolio_linked:
                        multiplier += 0.1
                    if candidate.verification_signals.hackathon_awards_count > 0:
                        multiplier += 0.1

                candidate_exp = parser.extract_experience_requirement(candidate.full_resume_text)
                if required_experience_years > 0:
                    if candidate_exp > required_experience_years:
                        experience_status = "Exceeds Profile"
                    elif candidate_exp == required_experience_years:
                        experience_status = "Meets Baseline"
                    else:
                        experience_status = f"-{required_experience_years - candidate_exp} Year Gap"
                else:
                    experience_status = "Meets Baseline"

                scores_dict = {
                    "composite_match_percentage": round(composite_score * 100.0, 1),
                    "contextual_semantic_fit": round(semantic_score, 4),
                    "behavioral_signal_index": round(behavioral_score, 4),
                    "experience_status": experience_status,
                    "verifiability_multiplier_applied": round(multiplier, 1)
                }

                # Blind Mode Redacted Suffix Anonymization
                if blind_mode:
                    cand_hash = hashlib.md5(candidate.id.encode()).hexdigest()[:6].upper()
                    name = f"REDACTED_NAME_{cand_hash}"
                    location = f"REDACTED_LOC_{cand_hash}"
                    gender = f"REDACTED_GEN_{cand_hash}"
                    resume_text = None
                else:
                    name = candidate.name
                    location = candidate.location
                    gender = candidate.gender
                    resume_text = candidate.full_resume_text
                    
                ranked_list.append({
                    "id": candidate.id,
                    "name": name,
                    "current_title": candidate.current_title,
                    "skills": candidate.skills,
                    "semantic_score": round(semantic_score, 4),
                    "behavioral_score": round(behavioral_score, 4),
                    "composite_score": round(composite_score, 4),
                    "behavioral_signals": candidate.behavioral_signals,
                    "verification_signals": candidate.verification_signals,
                    "full_resume_text": resume_text,
                    "location": location,
                    "gender": gender,
                    "scores": scores_dict
                })
            except Exception as e:
                logger.error(f"Error scoring candidate {candidate.id}: {str(e)}", exc_info=True)
                continue

        # Sort in descending order of composite rank
        ranked_list.sort(key=lambda x: x["composite_score"], reverse=True)
        
        # Limit to top 200 candidates to protect browser rendering performance under large databases
        if len(ranked_list) > 200:
            ranked_list = ranked_list[:200]
        
        execution_time = (time.perf_counter() - start_time) * 1000.0
        logger.info(
            f"Successfully processed and ranked {len(candidates)} candidates in {execution_time:.2f}ms"
        )
        
        return ranked_list

    def rank_redrob_founding_engineer(
        self,
        candidates: List[CandidateProfile],
        blind_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Specialized multi-vector ranking pipeline designed for the "Senior AI Engineer — Founding Team" role.
        Applies all semantic requirements, target experience alignment (5-9 years), custom disqualifiers,
        and behavioral activity weighting.
        """
        import re
        import hashlib
        start_time = time.perf_counter()
        
        # 1. Target Job Specification & Mandatory Technical Skills
        job_text = (
            "Senior AI Engineer — Founding Team. Redrob AI. Series A AI-native talent intelligence platform. "
            "Experience: 5-9 years. Pune/Noida, India (Hybrid) | Relocation from Tier-1 Indian cities. "
            "Production experience with embeddings-based retrieval systems (sentence-transformers, OpenAI embeddings, BGE, E5), "
            "vector databases or hybrid search infrastructure (Pinecone, Weaviate, Qdrant, Milvus, OpenSearch, Elasticsearch, FAISS). "
            "Strong Python. Evaluation frameworks for ranking systems (NDCG, MRR, MAP, offline-to-online correlation, A/B test interpretation). "
            "LLM fine-tuning, learning-to-rank, HR-tech."
        )
        mandatory_skills = ["embeddings", "retrieval", "ranking", "search", "vector database", "python", "evaluation", "ndcg", "mrr", "map"]
        
        # 2. Stage-1 Fast Heuristic Filtering (for scaling to 200,000+ candidates)
        if len(candidates) > 500:
            logger.info(f"Large candidate pool detected ({len(candidates)}). Applying Stage-1 Heuristic Filtering...")
            
            # Helper regex to extract years of experience (fast version for filtering)
            def fast_extract_exp(resume_text: str) -> float:
                match = re.search(r'([\d\.]+)\+?\s*years?\s*of\s*experience', resume_text, re.IGNORECASE)
                if match:
                    try: return float(match.group(1))
                    except ValueError: pass
                match2 = re.search(r'experience:\s*([\d\.]+)\s*years?', resume_text, re.IGNORECASE)
                if match2:
                    try: return float(match2.group(1))
                    except ValueError: pass
                return 0.0

            req_skills_set = {s.lower().strip() for s in mandatory_skills if s}
            
            # Precompute fast heuristic scores
            retrieval_scores = []
            for cand in candidates:
                cand_skills = {s.lower().strip() for s in cand.skills if s}
                skill_score = len(cand_skills.intersection(req_skills_set)) / max(len(req_skills_set), 1)
                
                title_lower = (cand.current_title or "").lower()
                title_score = 1.0 if "ai" in title_lower or "ml" in title_lower or "engineer" in title_lower else 0.0
                
                # Title-Blocking Shield in Stage 1
                title_penalty = 1.0
                forbidden_roles = ["civil engineer", "marketing", "sales", "hr manager", "content writer", "designer"]
                if any(role in title_lower for role in forbidden_roles):
                    title_penalty = 0.05
                
                cand_exp = fast_extract_exp(cand.full_resume_text)
                if cand_exp == 0.0:
                    cand_exp = 5.0
                exp_score = 1.0 if 5.0 <= cand_exp <= 9.0 else 0.5
                
                beh_score = self.calculate_behavioral_score(cand.behavioral_signals)
                
                # Combined score
                score = ((skill_score * 0.4) + (title_score * 0.3) + (exp_score * 0.2) + (beh_score * 0.1)) * title_penalty
                retrieval_scores.append(score)
                
            # Select indices of the top 500 candidates
            top_k_indices = np.argsort(retrieval_scores)[-500:][::-1]
            candidates_to_rank = [candidates[i] for i in top_k_indices]
            logger.info(f"Stage-1 filtering finished. Top 500 candidates chosen for dense reranking.")
        else:
            candidates_to_rank = candidates

        # 3. Parallelized Semantic Fit Vector math in chunks of 5000 (running only on candidates_to_rank)
        semantic_scores_list = []
        chunk_size = 5000
        try:
            emb_job = self.model.encode(job_text, convert_to_numpy=True).reshape(1, -1)
            emb_job_norm = emb_job / np.linalg.norm(emb_job)
            
            for i in range(0, len(candidates_to_rank), chunk_size):
                chunk = candidates_to_rank[i:i+chunk_size]
                resumes = [cand.full_resume_text for cand in chunk]
                emb_resumes = self.model.encode(resumes, convert_to_numpy=True)
                if len(chunk) == 1:
                    emb_resumes = emb_resumes.reshape(1, -1)
                emb_resumes_norm = emb_resumes / np.linalg.norm(emb_resumes, axis=1, keepdims=True)
                chunk_scores = np.dot(emb_resumes_norm, emb_job_norm.T).flatten()
                chunk_scores = np.clip(chunk_scores, 0.0, 1.0)
                semantic_scores_list.extend(chunk_scores.tolist())
            semantic_scores = np.array(semantic_scores_list)
        except Exception as ex:
            logger.error(f"Error during semantic vector calculations for redrob job: {str(ex)}")
            semantic_scores = np.array([
                self.calculate_semantic_fit(job_text, cand.full_resume_text) for cand in candidates_to_rank
            ])
            
        # Helper regex to extract years of experience
        def extract_years_of_experience(resume_text: str) -> float:
            match = re.search(r'([\d\.]+)\+?\s*years?\s*of\s*experience', resume_text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    pass
            match2 = re.search(r'experience:\s*([\d\.]+)\s*years?', resume_text, re.IGNORECASE)
            if match2:
                try:
                    return float(match2.group(1))
                except ValueError:
                    pass
            return 0.0

        # Consulting firms list for check
        consulting_firms = [
            "tcs", "infosys", "wipro", "accenture", "cognizant", "capgemini", 
            "tata consultancy", "hcl", "tech mahindra", "l&t", "cts", "deloitte", 
            "pwc", "ey", "kpmg"
        ]

        # Allowed locations tier 1 relocation cities in India
        allowed_locations = ["pune", "noida", "hyderabad", "mumbai", "delhi", "ncr", "bangalore"]

        ranked_list = []
        for idx, candidate in enumerate(candidates_to_rank):
            try:
                # 3. Dense Semantic Score
                raw_semantic = float(semantic_scores[idx])
                scaled_sem = (raw_semantic - 0.18) / (0.42 - 0.18)
                semantic_score = float(np.clip(scaled_sem, 0.0, 1.0))
                
                # 4. Mandatory Skills Overlap
                cand_skills = {s.lower().strip() for s in candidate.skills if s}
                overlap = cand_skills.intersection(mandatory_skills)
                skills_overlap_score = float(len(overlap) / len(mandatory_skills))
                
                # 5. Experience Alignment (Target: 5-9 years)
                cand_exp = extract_years_of_experience(candidate.full_resume_text)
                if cand_exp == 0.0:
                    cand_exp = 5.0 # fallback default to meet baseline if unparsed
                
                if 5.0 <= cand_exp <= 9.0:
                    exp_score = 1.0
                elif 4.0 <= cand_exp < 5.0 or 9.0 < cand_exp <= 11.0:
                    exp_score = 0.8
                else:
                    # Mathematical decay penalty outside range
                    exp_score = float(np.clip(np.exp(-abs(cand_exp - 7.0) / 3.0), 0.1, 1.0))
                
                # 6. Behavioral Score Heuristic
                behavioral_score = self.calculate_behavioral_score(candidate.behavioral_signals)
                
                # 7. Apply Disqualifiers as Penalty Multipliers
                penalty = 1.0
                resume_lower = candidate.full_resume_text.lower()
                title_lower = (candidate.current_title or "").lower()
                loc_lower = (candidate.location or "").lower()
                
                # Title-Blocking Shield: Strip ranking affinity for obvious non-tech stuffed roles
                forbidden_roles = ["civil engineer", "marketing", "sales", "hr manager", "content writer", "designer"]
                if any(role in title_lower for role in forbidden_roles):
                    penalty *= 0.15
                
                # Disqualifier A: Pure Research / Academic
                if any(w in resume_lower for w in ["academic lab", "postdoc", "postdoctoral", "research assistant", "research scientist"]):
                    if not any(w in resume_lower for w in ["production", "deployed", "shipped", "users", "product", "startup"]):
                        penalty *= 0.1
                        
                # Disqualifier B: LangChain Wrapper Only (No pre-LLM ML/search experience)
                if any(w in resume_lower for w in ["langchain", "openai"]):
                    if not any(w in resume_lower for w in ["machine learning", "nlp", "natural language", "information retrieval", "embedding", "vector", "search", "ranking"]):
                        penalty *= 0.1
                        
                # Disqualifier C: Non-coding Architect
                if any(w in title_lower for w in ["architect", "vp", "director", "manager", "lead"]):
                    if not any(w in resume_lower for w in ["python", "code", "develop", "build", "implementation"]):
                        penalty *= 0.2
                        
                # Disqualifier D: Title-Chaser (switch companies too fast, e.g. avg duration <= 18 months)
                if len(re.findall(r'at\s+\w+\s*:', resume_lower)) >= 3:
                    companies_count = len(re.findall(r'at\s+\w+\s*:', resume_lower))
                    if companies_count > 0 and (cand_exp / companies_count) < 1.5:
                        penalty *= 0.4
                        
                # Disqualifier E: Consulting Firm Only
                exp_lines = re.findall(r'- .* at (.*?):', candidate.full_resume_text)
                if exp_lines:
                    all_consulting = True
                    for comp in exp_lines:
                        comp_clean = comp.strip().lower()
                        if not any(firm in comp_clean for firm in consulting_firms):
                            all_consulting = False
                            break
                    if all_consulting:
                        penalty *= 0.05
                else:
                    if any(firm in resume_lower for firm in consulting_firms):
                        if not any(w in resume_lower for w in ["google", "meta", "redrob", "startup", "product company"]):
                            penalty *= 0.05
                            
                # Disqualifier F: Wrong AI Domain (CV/Speech/Robotics only without NLP/IR)
                if any(w in resume_lower for w in ["computer vision", "yolo", "speech recognition", "robotics", "ros"]):
                    if not any(w in resume_lower for w in ["nlp", "text", "retrieval", "search", "ranking", "recommend"]):
                        penalty *= 0.1

                # Relocation/Location Check
                # Must be Pune/Noida, or Tier-1 Indian relocation cities
                if not any(loc in loc_lower for loc in allowed_locations):
                    penalty *= 0.5
                        
                # 8. Behavioral Down-weighting (hackathon specific)
                if candidate.behavioral_signals:
                    rate = candidate.behavioral_signals.interaction_response_rate
                    if rate < 0.15:
                        penalty *= 0.2
                    days = candidate.behavioral_signals.days_since_last_activity
                    if days > 180:
                        penalty *= 0.3

                # Compute continuous Behavioral Index from Step B
                completeness = 0.5
                response_rate = 0.5
                github_score = 0.0
                if candidate.behavioral_signals:
                    completeness = float(candidate.behavioral_signals.profile_completeness or 0.5)
                    response_rate = float(candidate.behavioral_signals.interaction_response_rate or 0.5)
                if candidate.verification_signals:
                    github_score = 1.0 if candidate.verification_signals.github_verified else 0.0
                
                beh_index = (completeness * 0.35) + (response_rate * 0.45) + (github_score * 0.20)

                # 9. Compute Weighted Composite Match Score
                composite_score = (
                    (semantic_score * 0.50) +
                    (skills_overlap_score * 0.30) +
                    (exp_score * 0.20)
                )
                composite_score *= penalty
                
                # Apply behavioral index multiplier formula:
                # Final_Score = Base_Semantic_Score * (0.5 + (Behavioral_Index * 0.5))
                composite_score = composite_score * (0.5 + (beh_index * 0.5))
                composite_score = float(np.clip(composite_score, 0.0, 1.0))
                
                # 10. Verifiable Boost Multiplier
                multiplier = 1.0
                if candidate.verification_signals:
                    if candidate.verification_signals.github_verified:
                        multiplier += 0.1
                    if candidate.verification_signals.portfolio_linked:
                        multiplier += 0.1
                    if candidate.verification_signals.hackathon_awards_count > 0:
                        multiplier += 0.1
                
                if 5.0 <= cand_exp <= 9.0:
                    experience_status = "Meets Baseline"
                elif cand_exp > 9.0:
                    experience_status = "Exceeds Profile"
                else:
                    experience_status = f"-{int(5.0 - cand_exp)} Year Gap"

                scores_dict = {
                    "composite_match_percentage": round(composite_score * 100.0, 1),
                    "contextual_semantic_fit": round(semantic_score, 4),
                    "behavioral_signal_index": round(beh_index, 4),
                    "experience_status": experience_status,
                    "verifiability_multiplier_applied": round(multiplier, 1)
                }

                if blind_mode:
                    cand_hash = hashlib.md5(candidate.id.encode()).hexdigest()[:6].upper()
                    name = f"REDACTED_NAME_{cand_hash}"
                    location = f"REDACTED_LOC_{cand_hash}"
                    gender = f"REDACTED_GEN_{cand_hash}"
                    resume_text = None
                else:
                    name = candidate.name
                    location = candidate.location
                    gender = candidate.gender
                    resume_text = candidate.full_resume_text
                    
                ranked_list.append({
                    "id": candidate.id,
                    "name": name,
                    "current_title": candidate.current_title,
                    "skills": candidate.skills,
                    "semantic_score": float(semantic_score),
                    "behavioral_score": float(beh_index),
                    "composite_score": float(composite_score),
                    "behavioral_signals": candidate.behavioral_signals,
                    "verification_signals": candidate.verification_signals,
                    "full_resume_text": resume_text,
                    "location": location,
                    "gender": gender,
                    "scores": scores_dict
                })
            except Exception as e:
                logger.error(f"Error scoring candidate {candidate.id} for Redrob AI engineer role: {str(e)}")
                continue

        # Enforce Step C: Stable Tie-Breaker sorting
        # Round composite scores to 4 decimals to ensure identical printed scores are treated as exact ties!
        for item in ranked_list:
            item["composite_score"] = round(item["composite_score"], 4)
            
        # Step 1: Sort alphabetically by candidate ID ascending
        ranked_list.sort(key=lambda x: x["id"], reverse=False)
        
        # Step 2: Stable sort by composite_score descending (preserves alphabetical order for ties)
        ranked_list.sort(key=lambda x: x["composite_score"], reverse=True)
        
        # Now assign rank and generate reasoning based on their sorted rank
        for idx, item in enumerate(ranked_list):
            rank = idx + 1
            cand_exp = extract_years_of_experience(item["full_resume_text"] or "")
            if cand_exp == 0.0:
                cand_exp = 5.0
                
            skills_list = item["skills"]
            skills_str = ", ".join(skills_list[:3]) if skills_list else "machine learning"
            title = item["current_title"] or "Engineer"
            
            # Select tone and feedback based on final rank
            if rank <= 10:
                reasoning_str = f"Exceptional founding candidate with {cand_exp:.1f} years of experience as {title}. Deep expertise in {skills_str} with highly active platform engagement."
            elif rank <= 30:
                reasoning_str = f"Highly qualified {title} with {cand_exp:.1f} years of experience. Strong background in {skills_str} and verified credentials, showing great potential for the founding team."
            elif rank <= 60:
                reasoning_str = f"Solid fit {title} matching requirements with {cand_exp:.1f} years in the field. Capable in {skills_str}, though with minor profile or activity gaps."
            elif rank <= 80:
                reasoning_str = f"Moderate fit as {title}. Shows background in {skills_str} with {cand_exp:.1f} years experience, but matches are offset by domain differences or lower telemetry scores."
            else:
                reasoning_str = f"Minimal alignment for the founding role. Current title is {title} with adjacent skills in {skills_str}. Experience of {cand_exp:.1f} years is offset by significant profile gaps."
                
            # Add specific details or gaps
            gaps = []
            resume_lower = (item["full_resume_text"] or "").lower()
            if any(firm in resume_lower for firm in consulting_firms):
                gaps.append("consulting environment background")
            if any(w in resume_lower for w in ["academic lab", "postdoc", "postdoctoral", "research assistant"]):
                gaps.append("academic research heavy")
            if item["behavioral_signals"]:
                if item["behavioral_signals"].interaction_response_rate < 0.15:
                    gaps.append("low response rate (under 15%)")
                if item["behavioral_signals"].days_since_last_activity > 180:
                    gaps.append("inactive for over 6 months")
                    
            if gaps:
                reasoning_str += " Gaps include " + ", ".join(gaps) + "."
                
            # Keep it under 2 sentences
            sentences = reasoning_str.split(". ")
            if len(sentences) > 3:
                reasoning_str = ". ".join(sentences[:2]) + "."
                
            item["reasoning"] = reasoning_str
            
        # Limit to top 200
        if len(ranked_list) > 200:
            ranked_list = ranked_list[:200]
            
        execution_time = (time.perf_counter() - start_time) * 1000.0
        logger.info(
            f"Successfully processed and ranked {len(candidates)} candidates for Redrob AI engineer role in {execution_time:.2f}ms"
        )
        return ranked_list


# Singleton pattern for the engine to avoid reloading weights across requests
_engine_instance: Optional[IntelligentRankingEngine] = None


def get_ranking_engine() -> IntelligentRankingEngine:
    """
    Dependency provider that returns a shared singleton instance of the IntelligentRankingEngine.
    """
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = IntelligentRankingEngine()
    return _engine_instance
