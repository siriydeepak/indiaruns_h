"""
FastAPI Controller for Chaos Simulator.

Exposes endpoints for ranking incident responders against infrastructure outage scenarios.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.vector_store import talent_store
from app.services.ranking_engine import IntelligentRankingEngine, get_ranking_engine
from app.services.chaos_engine import ChaosSimulationEngine

logger = logging.getLogger(__name__)

router = APIRouter()


class ChaosSimulationRequest(BaseModel):
    scenario_id: str = Field(..., description="The ID of the outage incident")
    blind_mode: bool = Field(False, description="Flag indicating PII masking")


class ChaosResponder(BaseModel):
    id: str
    name: str
    current_title: str
    global_match_rank: int
    composite_match_percentage: float
    location: str
    verified_historical_proof: str


class ChaosSimulationResponse(BaseModel):
    results: List[ChaosResponder]


@router.post(
    "/chaos/simulate",
    response_model=ChaosSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate chaos responder matching",
    description="Ranks candidates against a simulated infrastructure outage and returns verification proofs."
)
async def simulate_chaos(
    payload: ChaosSimulationRequest,
    ranking_engine: IntelligentRankingEngine = Depends(get_ranking_engine)
) -> ChaosSimulationResponse:
    """
    Simulation endpoint. Matches candidates against real-world chaos scenarios.
    """
    logger.info(f"Simulating chaos incident: {payload.scenario_id} - blind_mode={payload.blind_mode}")
    
    try:
        # Fetch candidate profiles from InMemoryTalentStore
        candidates = talent_store.get_all_candidates()
        
        # Instantiate simulation engine
        chaos_engine = ChaosSimulationEngine()
        
        # Rank responders with semantic proof snippet extraction
        ranked_responders = chaos_engine.rank_incident_responders(
            scenario_id=payload.scenario_id,
            candidates=candidates,
            ranking_engine=ranking_engine,
            blind_mode=payload.blind_mode
        )
        
        # Format response
        results = [
            ChaosResponder(
                id=res["id"],
                name=res["name"],
                current_title=res["current_title"],
                global_match_rank=res["global_match_rank"],
                composite_match_percentage=res["composite_match_percentage"],
                location=res["location"],
                verified_historical_proof=res["verified_historical_proof"]
            )
            for res in ranked_responders
        ]
        
        return ChaosSimulationResponse(results=results)
        
    except ValueError as ve:
        logger.warning(f"Validation failure in chaos router: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Critical failure during chaos incident routing logic: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while calculating chaos simulation: {str(e)}"
        )
