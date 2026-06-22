import json
import pandas as pd
import shap
import joblib

CAUSAL_GRAPH = {
    "college_tier": ["skill_level"],
    "skill_level": ["fit_score"],
    "years_experience": ["title_seniority"],
    "title_seniority": ["fit_score"],
    "city": []
}

with open("mock_candidates.json", "r") as f:
    data = json.load(f)

df = pd.DataFrame(data)

X = df[
    [
        "skill_overlap",
        "years_experience",
        "semantic_similarity"
    ]
]

model = joblib.load("dummy_model.pkl")

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(X)

result = {}

for i in range(len(df)):

    result[str(int(df.iloc[i]["candidate_id"]))] = {

        "skill_overlap":
            float(shap_values[i][0]),

        "years_experience":
            float(shap_values[i][1]),

        "semantic_similarity":
            float(shap_values[i][2])
    }

with open("shap_values.json", "w") as f:
    json.dump(result, f, indent=4)

print("SHAP values saved successfully")