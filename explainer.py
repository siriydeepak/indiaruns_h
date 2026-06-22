import json

def explain(candidate_id):

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

print(explain(1))