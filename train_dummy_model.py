import json
import pandas as pd
import lightgbm as lgb
import joblib

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

y = [1,0,1,0,1,0,1,0,1,0]

model = lgb.LGBMRegressor(
    n_estimators=50,
    verbose=-1
)

model.fit(X, y)

joblib.dump(model, "dummy_model.pkl")

print("Model saved successfully")