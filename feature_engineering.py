from rapidfuzz import fuzz


def skill_overlap(jd_skills, candidate_skills):

    jd=set([x.lower() for x in jd_skills])

    cand=set([x.lower() for x in candidate_skills])

    intersection=len(jd & cand)

    union=len(jd | cand)

    return intersection/union if union else 0


def experience_score(required_years,candidate_years):

    return min(candidate_years/required_years,1)


def career_progression(job_titles,years):

    seniority={

        "intern":1,

        "engineer":2,

        "senior engineer":3,

        "lead":4,

        "manager":5

    }

    scores=[]

    for title in job_titles:

        title=title.lower()

        found=1

        for key,val in seniority.items():

            if key in title:

                found=val

        scores.append(found)

    avg=sum(scores)/len(scores)

    return avg/max(years,1)


def title_alignment(jd_title,candidate_titles):

    best=0

    for title in candidate_titles:

        score=fuzz.ratio(

            jd_title.lower(),

            title.lower()

        )/100

        best=max(best,score)

    return best