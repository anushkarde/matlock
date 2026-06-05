import os
from pinecone import Pinecone, ServerlessSpec

INDEX_NAME = "matlock-cases"
DIMENSION = 3072  # text-embedding-3-large output dimension

_index = None


def get_index():
    global _index
    if _index is not None:
        return _index

    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

    existing = {idx.name for idx in pc.list_indexes()}
    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    _index = pc.Index(INDEX_NAME)
    return _index


def upsert_vectors(vectors: list[dict]) -> int:
    if not vectors:
        return 0
    index = get_index()
    # Pinecone recommends batches of 100
    batch_size = 100
    total = 0
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        total += len(batch)
    return total


def query_vectors(
    vector: list[float],
    top_k: int = 25,
    filter_dict: dict | None = None,
) -> list[dict]:
    index = get_index()
    kwargs: dict = {"vector": vector, "top_k": top_k, "include_metadata": True}
    if filter_dict:
        kwargs["filter"] = filter_dict
    results = index.query(**kwargs)
    return [
        {
            "id": m.id,
            "score": m.score,
            "metadata": m.metadata or {},
        }
        for m in results.matches
    ]
