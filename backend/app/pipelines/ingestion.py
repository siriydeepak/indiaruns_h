"""
Ingestion Pipeline Services for streaming candidate dataset documents.
"""

import json
import logging
from typing import Generator, Dict, Any
from app.schemas.candidate import CandidateProfile

logger = logging.getLogger(__name__)


def execute_document_constraints_pipeline(file_like_object) -> Generator[CandidateProfile, None, None]:
    """
    Reads JSONL data line-by-line using a python generator stream (yield).
    
    Ensures that WeHire scales to process 200,000+ records sequentially 
    without exceeding the 16GB RAM constraints.
    """
    logger.info("Executing JSONL document constraints pipeline...")
    from app.api.endpoints.discover import map_judges_candidate_to_profile
    
    line_idx = 0
    for line in file_like_object:
        line_idx += 1
        if not line:
            continue
        try:
            line_str = line.decode("utf-8").strip() if isinstance(line, bytes) else line.strip()
            if not line_str:
                continue
            cand_data = json.loads(line_str)
            
            # Map and validate
            if "candidate_id" in cand_data or "profile" in cand_data:
                profile_model = map_judges_candidate_to_profile(cand_data)
            else:
                profile_model = CandidateProfile(**cand_data)
                
            yield profile_model
        except Exception as e:
            logger.error(f"Error parsing line {line_idx} in JSONL: {str(e)}")
            continue
