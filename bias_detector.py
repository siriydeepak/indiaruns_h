import json

def detect_proxy_bias():

    with open("shap_values.json") as f:
        data = json.load(f)

    flagged = []

    for candidate in data.values():

        ranked = sorted(
            candidate.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        top3 = [x[0] for x in ranked[:3]]

        if "college_tier" in top3:
            flagged.append("college_tier")

        if "city" in top3:
            flagged.append("city")

    return list(set(flagged))

print(detect_proxy_bias())