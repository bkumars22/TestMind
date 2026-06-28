"""
Hybrid Search — BM25 + dense vector fused via Reciprocal Rank Fusion (RRF).

hybrid_search(query, project_id, top_k, source_type, alpha) → list[dict]

RRF formula:  score(d) = Σ  1 / (k + rank_i(d))
              where k=60 (constant, dampens top-rank advantage)

Each result carries:
  content, metadata, source_type,
  dense_score   — cosine similarity from pgvector
  bm25_score    — normalised BM25 score
  rrf_score     — fused RRF score (higher = more relevant)
  found_by      — 'both' | 'dense' | 'bm25'
"""
from __future__ import annotations

import logging
from typing import Any

from rag.embedder import embed
from rag.vector_store import search as dense_search
from rag import bm25_index

logger = logging.getLogger("rag.hybrid_search")

_RRF_K = 60  # standard RRF constant


def _rrf_fuse(
    dense_results: list[dict],
    bm25_results:  list[dict],
    top_k: int,
) -> list[dict[str, Any]]:
    """
    Merge and re-rank two ranked lists via Reciprocal Rank Fusion.
    Documents found by both retrievers get a double boost.
    """
    # Key: content hash (stable across both lists)
    scores: dict[int, dict] = {}

    for rank, doc in enumerate(dense_results):
        key = hash(doc["content"])
        if key not in scores:
            scores[key] = {
                **doc,
                "dense_score": round(doc.get("similarity", 0), 4),
                "bm25_score":  0.0,
                "rrf_score":   0.0,
                "found_by":    "dense",
            }
        scores[key]["rrf_score"] += 1.0 / (_RRF_K + rank + 1)

    for rank, doc in enumerate(bm25_results):
        key = hash(doc["content"])
        bm25_s = round(doc.get("bm25_score", 0), 4)
        if key not in scores:
            scores[key] = {
                **doc,
                "dense_score": 0.0,
                "bm25_score":  bm25_s,
                "rrf_score":   0.0,
                "found_by":    "bm25",
            }
        else:
            scores[key]["bm25_score"] = bm25_s
            scores[key]["found_by"]   = "both"
        scores[key]["rrf_score"] += 1.0 / (_RRF_K + rank + 1)

    # Round and sort
    merged = sorted(scores.values(), key=lambda x: -x["rrf_score"])
    for d in merged:
        d["rrf_score"] = round(d["rrf_score"], 6)

    return merged[:top_k]


def hybrid_search(
    query:       str,
    project_id:  int | str,
    top_k:       int = 8,
    source_type: str | None = None,
    fetch_k:     int = 20,  # retrieve more from each then re-rank
) -> list[dict[str, Any]]:
    """
    Run dense + BM25 retrieval in parallel, fuse with RRF.

    Falls back to dense-only if BM25 index is unavailable.
    """
    pid = str(project_id)

    # Dense retrieval
    try:
        q_embed = embed(query)
        dense_results = dense_search(
            query_embedding=q_embed,
            project_id=pid,
            top_k=fetch_k,
            source_type=source_type,
            min_similarity=0.15,   # lower threshold — RRF will re-rank anyway
        )
    except Exception as exc:
        logger.warning("Dense search failed: %s", exc)
        dense_results = []

    # BM25 retrieval
    try:
        bm25_results = bm25_index.search(
            query=query,
            project_id=pid,
            top_k=fetch_k,
            source_type=source_type,
        )
    except Exception as exc:
        logger.warning("BM25 search failed: %s", exc)
        bm25_results = []

    # If BM25 unavailable, return dense results as-is (labelled 'dense')
    if not bm25_results:
        logger.debug("BM25 unavailable — returning dense-only results")
        return [
            {
                **d,
                "dense_score": round(d.get("similarity", 0), 4),
                "bm25_score":  0.0,
                "rrf_score":   round(1.0 / (_RRF_K + i + 1), 6),
                "found_by":    "dense",
            }
            for i, d in enumerate(dense_results[:top_k])
        ]

    fused = _rrf_fuse(dense_results, bm25_results, top_k)
    logger.info(
        "Hybrid search: dense=%d bm25=%d fused=%d (both=%d)",
        len(dense_results), len(bm25_results), len(fused),
        sum(1 for d in fused if d["found_by"] == "both"),
    )
    return fused
