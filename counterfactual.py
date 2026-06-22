import json

def counterfactual(candidate_id):

    with open("shap_values.json") as f:
        data = json.load(f)

    vals = data[str(candidate_id)]
    worst_feature = min(vals, key=vals.get)

    return {
        "candidate_id": candidate_id,
        "suggestion":
        f"Improve {worst_feature} to increase ranking."
    }

print(counterfactual(1))