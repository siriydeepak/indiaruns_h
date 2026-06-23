import json

from fastapi import FastAPI

from pydantic import BaseModel

from ranker import rank_candidates


app=FastAPI()


class RankRequest(

BaseModel

):

    jd_text:str
    title:str

    skills:list

    years:int


@app.post("/rank")

def rank(request:RankRequest):


    with open(

    'data/mock_candidates.json'

    ) as f:

        candidates=json.load(f)


    jd={

    "text":request.jd_text,

    "title":request.title,

    "skills":request.skills,

    "years":request.years

    }


    return rank_candidates(

    jd,

    candidates

    )


@app.get(

"/explain/{candidate_id}"

)

def explain(

candidate_id:str

):

    return {

    "features":[

    "Python",

    "Experience",

    "Semantic Match"

    ],

    "shap_values":[

    0.4,

    0.2,

    -0.05

    ],

    "summary":

    "Mock explanation"

    }


@app.get(

"/bias-report"

)

def bias_report():

    return {

    "disparate_impact_before":

    0.62,

    "disparate_impact_after":

    0.91,

    "flagged_features":[

    "college_tier"

    ]

    }