import pandas as pd

from feature_engineering import *

from jd_parser import semantic_similarity

from model import fallback_score


def rank_candidates(

jd,

candidates

):

    ranked=[]

    jd_skills=jd["skills"]

    jd_title=jd["title"]

    req_exp=jd["years"]

    jd_text=jd["text"]


    for candidate in candidates:

        skill=skill_overlap(

        jd_skills,

        candidate["skills"]

        )


        exp=experience_score(

        req_exp,

        candidate["years_experience"]

        )


        progression=career_progression(

        candidate["job_titles"],

        candidate["years_experience"]

        )


        alignment=title_alignment(

        jd_title,

        candidate["job_titles"]

        )


        candidate_text=" ".join(

        candidate["skills"]

        )+" "+candidate["college_name"]


        semantic=semantic_similarity(

        jd_text,

        candidate_text

        )


        fit=fallback_score(

        skill,

        exp,

        semantic

        )


        matched=list(

        set(jd_skills)

        &

        set(candidate["skills"])

        )[:3]


        ranked.append(

        {

            "candidate_id":

            candidate["candidate_id"],

            "name":

            candidate["name"],

            "fit_score":

            fit,

            "skills_matched":

            matched

        }

        )


    ranked=sorted(

    ranked,

    key=lambda x:x["fit_score"],

    reverse=True

    )


    for i,row in enumerate(

    ranked

    ):

        row["rank"]=i+1


    pd.DataFrame(

    ranked

    ).to_csv(

    "outputs/ranked_candidates.csv",

    index=False

    )


    return ranked