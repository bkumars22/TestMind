"""QAIP RAG retriever.

retrieve_for_file(project_id, file_path) — main entry point.
  Retrieves the top-k most similar past test cases and defects
  for a given file, formatted as few-shot examples for the LLM.

retrieve_similar_defects(project_id, defect_title) — for explain_and_score.
  Pulls similar past defects so the LLM can see how we explained them before.

query(project_id, question, hybrid=True) — natural-language search.
  hybrid=True  → BM25 + dense, fused via RRF  (Prompt 6)
  hybrid=False → dense-only (original behaviour)
"""

from __future__ import annotations

import logging
from typing import Any

from .embedder import embed
from .vector_store import search
from .hybrid_search import hybrid_search

logger = logging.getLogger("rag.retriever")


def retrieve_for_file(
    project_id: int | str,
    file_path: str,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    """Retrieve the most relevant past test cases for a file path.

    Returns a list of dicts with keys: content, metadata, source_type, similarity.
    Empty list if RAG is unavailable or nothing similar found.
    """
    query_text = f"tests for file: {file_path}"
    try:
        q_embed = embed(query_text)
        results = search(
            query_embedding=q_embed,
            project_id=str(project_id),
            top_k=top_k,
            source_type="test_case",
            min_similarity=0.25,
        )
        logger.debug("retrieve_for_file(%s) → %d results", file_path, len(results))
        return results
    except Exception as exc:
        logger.warning("retrieve_for_file failed: %s", exc)
        return []


def retrieve_similar_defects(
    project_id: int | str,
    defect_title: str,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    """Retrieve past defects similar to the given title."""
    try:
        q_embed = embed(defect_title)
        return search(
            query_embedding=q_embed,
            project_id=str(project_id),
            top_k=top_k,
            source_type="defect",
            min_similarity=0.3,
        )
    except Exception as exc:
        logger.warning("retrieve_similar_defects failed: %s", exc)
        return []


def query(
    project_id: int | str,
    question: str,
    top_k: int = 5,
    source_type: str | None = None,
    hybrid: bool = True,
) -> list[dict[str, Any]]:
    """Open-ended NL search over all stored QAIP documents.

    hybrid=True  — BM25 + dense fused via RRF (default, Prompt 6)
    hybrid=False — dense-only (original behaviour)
    """
    if hybrid:
        try:
            return hybrid_search(
                query=question,
                project_id=project_id,
                top_k=top_k,
                source_type=source_type,
            )
        except Exception as exc:
            logger.warning("hybrid_search failed, falling back to dense: %s", exc)

    # Dense-only path (fallback or explicit)
    try:
        q_embed = embed(question)
        return search(
            query_embedding=q_embed,
            project_id=str(project_id),
            top_k=top_k,
            source_type=source_type,
            min_similarity=0.2,
        )
    except Exception as exc:
        logger.warning("query failed: %s", exc)
        return []


def format_few_shot_examples(retrieved: list[dict[str, Any]]) -> str:
    """Format retrieved docs as a few-shot block for LLM prompts."""
    if not retrieved:
        return ""

    lines = ["--- SIMILAR TEST CASES FROM PREVIOUS SPRINTS ---"]
    for i, doc in enumerate(retrieved, 1):
        meta = doc.get("metadata", {})
        sim = doc.get("similarity", 0)
        fp = meta.get("file_path", "unknown")
        lines.append(f"\n[Example {i}] File: {fp} (similarity: {sim:.2f})")
        # Show first 600 chars of the test code
        code_block = doc["content"]
        if "Test code:\n" in code_block:
            code_block = code_block.split("Test code:\n", 1)[1]
        lines.append(code_block[:600])
    lines.append("--- END EXAMPLES ---")
    return "\n".join(lines)
