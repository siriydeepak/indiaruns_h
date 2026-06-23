from sentence_transformers import SentenceTransformer

from sklearn.metrics.pairwise import cosine_similarity


model=SentenceTransformer(

'all-MiniLM-L6-v2'

)


def semantic_similarity(

jd_text,

candidate_text

):

    jd_embedding=model.encode([jd_text])

    cand_embedding=model.encode(

    [candidate_text]

    )

    similarity=cosine_similarity(

    jd_embedding,

    cand_embedding

    )[0][0]

    return float(similarity)