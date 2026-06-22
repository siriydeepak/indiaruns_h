from fastapi import FastAPI
import json

app = FastAPI()


@app.get("/")
def home():
    return {"message": "FairHire XAI API Running"}


@app.get("/explain/{candidate_id}")
def explain(candidate_id: int):

    with open("shap_values.json") as f:
        data = json.load(f)

    vals = data[str(candidate_id)]

    best_feature = max(vals, key=vals.get)

    return {
        "features": list(vals.keys()),
        "shap_values": list(vals.values()),
        "summary":
        f"Candidate ranked highly because of {best_feature}"
    }


@app.get("/counterfactual/{candidate_id}")
def counterfactual(candidate_id: int):

    with open("shap_values.json") as f:
        data = json.load(f)

    vals = data[str(candidate_id)]

    worst_feature = min(vals, key=vals.get)

    return {
        "candidate_id": candidate_id,
        "suggestion":
        f"Improve {worst_feature} to increase ranking."
    }


@app.get("/bias")
def bias():

    return {
        "flagged_features": []
    }