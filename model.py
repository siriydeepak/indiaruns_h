import joblib

from lightgbm import LGBMRegressor


def train_model(X,y):

    model=LGBMRegressor(

        n_estimators=100,

        random_state=42

    )

    model.fit(X,y)

    joblib.dump(

    model,

    'model.pkl'

    )

    return model


def fallback_score(

skill,

exp,

semantic

):

    score=(

    skill*0.4+

    exp*0.3+

    semantic*0.3

    )

    return round(score,3)