"""
BM25 in-memory index over QAIP's rag_documents table.

Built lazily per (project_id, source_type) pair with a 5-minute TTL.
Re-built automatically when documents are added via invalidate().

Requires: pip install rank-bm25
Falls back gracefully (returns empty list) when the library is absent or the
database is unavailable.
"""
from __future__ import annotations

import logging
import re
import time
from typing import Any

logger = logging.getLogger("rag.bm25_index")

_TTL = 300  # seconds before index is considered stale

# Cache: {cache_key: {"index": BM25Okapi, "docs": list[dict], "built_at": float}}
_cache: dict[str, dict] = {}


def _cache_key(project_id: str, source_type: str | None) -> str:
    return f"{project_id}:{source_type or '*'}"


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + lowercase tokenizer — no external deps."""
    text = re.sub(r"[^a-zA-Z0-9_\-\./]", " ", text).lower()
    return [t for t in text.split() if len(t) > 1]


def _fetch_docs(project_id: str, source_type: str | None) -> list[dict[str, Any]]:
    """Fetch all documents for a project from PostgreSQL."""
    from rag.vector_store import _conn  # reuse connection helper
    try:
        conn = _conn()
        with conn.cursor() as cur:
            if source_type:
                cur.execute(
                    "SELECT id, content, metadata, source_type FROM rag_documents "
                    "WHERE project_id = %s AND source_type = %s ORDER BY id",
                    (project_id, source_type),
                )
            else:
                cur.execute(
                    "SELECT id, content, metadata, source_type FROM rag_documents "
                    "WHERE project_id = %s ORDER BY id",
                    (project_id,),
                )
            rows = cur.fetchall()
        conn.close()
        import json
        docs = []
        for row in rows:
            meta = row[2]
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            docs.append({
                "id":          row[0],
                "content":     row[1],
                "metadata":    meta or {},
                "source_type": row[3],
            })
        return docs
    except Exception as exc:
        logger.warning("BM25 doc fetch failed: %s", exc)
        return []


def _build(project_id: str, source_type: str | None) -> dict | None:
    """Build and cache a BM25 index for the given project / source filter."""
    try:
        from rank_bm25 import BM25Okapi  # type: ignore
    except ImportError:
        logger.info("rank-bm25 not installed — BM25 search disabled")
        return None

    docs = _fetch_docs(project_id, source_type)
    if not docs:
        return None

    corpus = [_tokenize(d["content"]) for d in docs]
    index = BM25Okapi(corpus)
    entry = {"index": index, "docs": docs, "built_at": time.monotonic()}
    _cache[_cache_key(project_id, source_type)] = entry
    logger.info("BM25 index built: project=%s type=%s docs=%d", project_id, source_type or "*", len(docs))
    return entry


def _get_or_build(project_id: str, source_type: str | None) -> dict | None:
    key = _cache_key(project_id, source_type)
    entry = _cache.get(key)
    if entry and (time.monotonic() - entry["built_at"]) < _TTL:
        return entry
    return _build(project_id, source_type)


def invalidate(project_id: str, source_type: str | None = None) -> None:
    """Force a rebuild next time search() is called."""
    key = _cache_key(project_id, source_type)
    _cache.pop(key, None)
    # Also invalidate the wildcard index if a specific type is given
    if source_type:
        _cache.pop(_cache_key(project_id, None), None)


def search(
    query: str,
    project_id: str,
    top_k: int = 10,
    source_type: str | None = None,
) -> list[dict[str, Any]]:
    """
    Return top-k documents ranked by BM25 score.

    Each result dict: content, metadata, source_type, bm25_score (normalised 0-1).
    Returns empty list if BM25 is unavailable or index is empty.
    """
    entry = _get_or_build(project_id, source_type)
    if not entry:
        return []

    tokens = _tokenize(query)
    if not tokens:
        return []

    try:
        raw_scores: list[float] = entry["index"].get_scores(tokens).tolist()
    except Exception as exc:
        logger.warning("BM25 get_scores failed: %s", exc)
        return []

    max_score = max(raw_scores) if raw_scores else 0.0
    if max_score <= 0:
        return []

    # Pair and sort
    pairs = sorted(
        enumerate(raw_scores),
        key=lambda x: -x[1],
    )[:top_k]

    results = []
    for idx, raw_score in pairs:
        if raw_score <= 0:
            continue
        doc = entry["docs"][idx]
        results.append({
            **doc,
            "bm25_score": round(raw_score / max_score, 4),  # normalised
            "bm25_raw":   round(raw_score, 4),
        })
    return results
