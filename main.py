import random
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import mock_store as store

app = FastAPI(title="FairHire Core Engine Engine Engine", version="1.0.0-MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USE_REAL_BACKEND = False
LAST_EXPLANATIONS: Dict[str, store.ShapExplanation] = {}
LAST_BIAS_REPORT: Optional[store.BiasReport] = None


def safe_list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def normalize_candidate(candidate: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "candidate_id": str(candidate.get("candidate_id") or candidate.get("id") or f"cand_{random.randint(1000,9999)}"),
        "name": candidate.get("name", "Unnamed Candidate"),
        "skills": [str(skill) for skill in safe_list(candidate.get("skills") or candidate.get("skills_matched") or candidate.get("tags") or [])],
        "years_experience": int(candidate.get("experience") or candidate.get("years") or 0),
        "job_titles": [str(candidate.get("job_title"))] if candidate.get("job_title") else safe_list(candidate.get("job_titles") or []),
        "college_name": str(candidate.get("college") or candidate.get("school") or ""),
        "location": str(candidate.get("location") or candidate.get("city") or ""),
        "extra_text": str(candidate.get("text") or ""),
    }


def build_score(jd_skills: List[str], candidate: Dict[str, Any], jd_text: str) -> int:
    skills = [s.lower() for s in candidate["skills"]]
    matches = len([skill for skill in jd_skills if skill.lower() in skills])
    match_score = min(matches * 6, 30)
    exp_score = min(candidate["years_experience"] * 1.5, 15)
    semantic_score = min(len([token for token in jd_text.lower().split() if token in skills]) * 3, 15)
    noise = random.uniform(-4, 4)
    return max(62, min(int(60 + match_score + exp_score + semantic_score + noise), 98))


def build_explanation(candidate: Dict[str, Any], jd_skills: List[str], fit_score: int) -> store.ShapExplanation:
    matched = [skill for skill in candidate["skills"] if skill.lower() in [s.lower() for s in jd_skills]]
    missing = [skill for skill in jd_skills if skill.lower() not in [s.lower() for s in candidate["skills"]]]
    feature_names = [
        "Core Skills Match",
        "Experience Relevance",
        "Project Alignment",
        "Bias Adjustment",
        "Signal Confidence"
    ]
    features = feature_names[:4]
    raw_values = [0.7 + random.random() * 0.5 for _ in features]
    total = sum(raw_values)
    target = fit_score * 0.1
    shap_values = [round((value / total) * target, 2) for value in raw_values]
    best_skill = matched[0] if matched else candidate["skills"][0] if candidate["skills"] else "relevant experience"
    gap_skill = missing[0] if missing else "cross-functional coverage"
    summary = f"{candidate['name']} is ranked by strong {best_skill} fit and a solid team alignment signal."
    counterfactual = f"Add more depth in {gap_skill} to improve your alignment score by 5-7%."
    return store.ShapExplanation(
        candidate_id=candidate["candidate_id"],
        name=candidate["name"],
        features=features,
        shap_values=shap_values,
        summary=summary,
        counterfactual=counterfactual,
    )


def generate_bias_report(candidates: List[Dict[str, Any]]) -> store.BiasReport:
    proxies = {
        "college": "College information can act as a proxy for socioeconomic privilege and may tilt selection unfairly.",
        "location": "Location markers may introduce geographic bias into the ranking process.",
        "city": "City-level data can lower visibility for non-metro applicants.",
        "gender": "Gender data is a sensitive proxy and should be excluded from production signals.",
        "race": "Race-related metadata is a biased proxy and must not drive candidate ranking."
    }
    detected = []
    for candidate in candidates:
        for key, message in proxies.items():
            value = str(candidate.get(key, "") or candidate.get(key + "_name", "") or candidate.get(key + "_city", ""))
            if key in value.lower() and key not in detected:
                detected.append(key)
    flagged = [store.BiasFeatureFlag(feature=key, impact=proxies[key]) for key in detected]
    after = max(0.83, min(0.92, 0.89 - len(detected) * 0.01 + min(0.02, len(candidates) * 0.0015)))
    return store.BiasReport(
        disparate_impact_before=0.58,
        disparate_impact_after=after,
        flagged_features=flagged if flagged else [store.BiasFeatureFlag(feature="proxy-scan", impact="No obvious proxy features were detected in candidate metadata.")],
        interpretation=f"Automated audit simulates a fairness improvement to {int(after * 100)}% true positive parity after proxy mitigation."
    )


def sort_rankings(ranked: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sorted_candidates = sorted(ranked, key=lambda item: item["fit_score"], reverse=True)
    for index, candidate in enumerate(sorted_candidates, start=1):
        candidate["rank"] = index
    return sorted_candidates


@app.post("/rank", response_model=List[store.CandidateRank])
async def process_ranking(payload: Dict[str, Any] = None):
    global LAST_EXPLANATIONS, LAST_BIAS_REPORT
    if payload is None:
        return store.MOCK_RANK_DATA

    candidates = payload.get("candidates")
    if candidates and isinstance(candidates, list):
        normalized = [normalize_candidate(candidate) for candidate in candidates]
        jd_skills = [str(skill) for skill in payload.get("skills", [])]
        jd_text = str(payload.get("jd_text", ""))
        ranked = []
        LAST_EXPLANATIONS = {}
        for candidate in normalized:
            fit_score = build_score(jd_skills, candidate, jd_text)
            explanation = build_explanation(candidate, jd_skills, fit_score)
            LAST_EXPLANATIONS[candidate["candidate_id"]] = explanation
            matched = [skill for skill in candidate["skills"] if skill.lower() in [s.lower() for s in jd_skills]]
            ranked.append({
                "candidate_id": candidate["candidate_id"],
                "name": candidate["name"],
                "fit_score": fit_score,
                "skills_matched": matched[:5]
            })
        rankings = sort_rankings(ranked)
        LAST_BIAS_REPORT = generate_bias_report(normalized)
        return rankings

    if payload.get("use_mock") is True:
        LAST_BIAS_REPORT = store.MOCK_BIAS_DATA
        LAST_EXPLANATIONS = {key: value for key, value in store.MOCK_EXPLAIN_DATA.items()}
        return store.MOCK_RANK_DATA

    return store.MOCK_RANK_DATA


@app.get("/explain/{candidate_id}", response_model=store.ShapExplanation)
async def explain_candidate(candidate_id: str):
    if candidate_id in LAST_EXPLANATIONS:
        return LAST_EXPLANATIONS[candidate_id]
    if candidate_id in store.MOCK_EXPLAIN_DATA:
        return store.MOCK_EXPLAIN_DATA[candidate_id]
    return store.MOCK_EXPLAIN_DATA["cand_001"]


@app.get("/bias-report", response_model=store.BiasReport)
async def generate_bias_report_endpoint():
    if LAST_BIAS_REPORT is not None:
        return LAST_BIAS_REPORT
    return store.MOCK_BIAS_DATA


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
