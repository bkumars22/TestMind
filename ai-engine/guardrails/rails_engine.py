"""
QAIP Guardrails Engine — NeMo Guardrails-inspired rail system.

Two-tier architecture:
  Tier 1  Instant regex pattern checks (zero LLM cost):
            check_length, check_jailbreak, check_prompt_injection, check_pii_request
  Tier 2  LLM-based topical classification (Groq fast model, only if Tier 1 passes):
            check_off_topic
  Output  Regex filter on generated answers:
            check_pii_output, check_sensitive_disclosure

Public API:
  engine = GuardrailsEngine()
  result = engine.check_input(question)   → GuardrailResult
  result = engine.check_output(answer, question) → GuardrailResult
"""
from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger("qaip.guardrails")

_CONFIG_PATH = Path(__file__).parent / "rails_config.yaml"
_GROQ_KEY    = os.getenv("GROQ_API_KEY", "")


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class GuardrailResult:
    passed:        bool
    rail_triggered: str | None = None   # which rail fired
    risk_score:    float = 0.0          # 0 = safe, 1 = definitely malicious
    blocked_reason: str | None = None   # human-readable explanation
    safe_message:  str | None = None    # replacement message shown to user
    latency_ms:    int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed":          self.passed,
            "rail_triggered":  self.rail_triggered,
            "risk_score":      round(self.risk_score, 3),
            "blocked_reason":  self.blocked_reason,
            "safe_message":    self.safe_message,
            "latency_ms":      self.latency_ms,
        }


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_config() -> dict:
    try:
        with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception as exc:
        logger.warning("Could not load rails_config.yaml: %s — using empty config", exc)
        return {}


def _patterns(category: str) -> list[re.Pattern]:
    cfg = _load_config()
    raw = cfg.get("blocked_patterns", {}).get(category, [])
    compiled = []
    for p in raw:
        try:
            compiled.append(re.compile(p, re.IGNORECASE | re.DOTALL))
        except re.error as exc:
            logger.warning("Bad regex in %s: %r — %s", category, p, exc)
    return compiled


def _out_patterns(category: str) -> list[re.Pattern]:
    cfg = _load_config()
    raw = cfg.get("output_filters", {}).get(category, [])
    compiled = []
    for p in raw:
        try:
            compiled.append(re.compile(p, re.IGNORECASE | re.DOTALL))
        except re.error:
            pass
    return compiled


def _policy(key: str, default: Any = None) -> Any:
    return _load_config().get("policies", {}).get(key, default)


# ---------------------------------------------------------------------------
# Tier 1 — Pattern checks (instant, zero LLM cost)
# ---------------------------------------------------------------------------

def _check_length(text: str, max_chars: int) -> GuardrailResult | None:
    if len(text) > max_chars:
        return GuardrailResult(
            passed=False,
            rail_triggered="check_length",
            risk_score=0.1,
            blocked_reason=f"Input too long ({len(text)} chars, max {max_chars}).",
            safe_message="Please keep your question under 2000 characters.",
        )
    return None


def _check_patterns(text: str, category: str, rail_name: str, risk: float, msg: str) -> GuardrailResult | None:
    for pat in _patterns(category):
        m = pat.search(text)
        if m:
            logger.warning("[guardrails] %s triggered — matched: %r", rail_name, m.group()[:60])
            return GuardrailResult(
                passed=False,
                rail_triggered=rail_name,
                risk_score=risk,
                blocked_reason=f"{rail_name}: matched pattern '{m.group()[:40]}'",
                safe_message=msg,
            )
    return None


# ---------------------------------------------------------------------------
# Tier 2 — LLM topical classification
# ---------------------------------------------------------------------------

def _llm_off_topic_check(question: str) -> tuple[bool, float]:
    """
    Returns (is_on_topic: bool, confidence: float).
    Uses keyword heuristic first; falls back to Groq LLM only when ambiguous.
    """
    cfg       = _load_config()
    keywords  = [k.lower() for k in cfg.get("topics", {}).get("allowed_keywords", [])]
    q_lower   = question.lower()

    # Fast keyword heuristic
    if any(kw in q_lower for kw in keywords):
        return True, 0.95

    # Short questions that don't mention any QA keyword → LLM check
    if not _GROQ_KEY:
        return True, 0.5   # no key → assume on-topic

    threshold = float(_policy("off_topic_llm_threshold", 0.35))

    try:
        from groq import Groq
        client = Groq(api_key=_GROQ_KEY)
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a topic classifier for a QA (quality assurance / software testing) "
                        "knowledge base. Reply ONLY with valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Is the following question related to software testing, QA, defects, "
                        f"test cases, CI/CD pipelines, or code quality?\n\n"
                        f"Question: {question[:500]}\n\n"
                        f'Reply: {{"on_topic": true/false, "confidence": 0.0-1.0}}'
                    ),
                },
            ],
            temperature=0.0,
            max_tokens=40,
        )
        raw = resp.choices[0].message.content.strip()
        import json
        data = json.loads(re.search(r"\{.*\}", raw, re.DOTALL).group())
        on_topic   = bool(data.get("on_topic", True))
        confidence = float(data.get("confidence", 0.5))
        return on_topic, confidence
    except Exception as exc:
        logger.warning("LLM off-topic check failed (assuming on-topic): %s", exc)
        return True, 0.5


# ---------------------------------------------------------------------------
# Output filters
# ---------------------------------------------------------------------------

def _check_output_patterns(answer: str, category: str, rail_name: str) -> GuardrailResult | None:
    for pat in _out_patterns(category):
        m = pat.search(answer)
        if m:
            logger.warning("[guardrails] output rail %s triggered: %r", rail_name, m.group()[:40])
            return GuardrailResult(
                passed=False,
                rail_triggered=rail_name,
                risk_score=float(_policy("pii_risk_score", 0.9)),
                blocked_reason=f"Output contains sensitive pattern: '{m.group()[:30]}...'",
                safe_message="The response was blocked because it appeared to contain sensitive credentials or PII.",
            )
    return None


# ---------------------------------------------------------------------------
# Public engine
# ---------------------------------------------------------------------------

class GuardrailsEngine:
    """
    Drop-in guardrails layer wrapping the RAG pipeline.

    Usage:
        engine = GuardrailsEngine()

        ir = engine.check_input(question)
        if not ir.passed:
            return ir.to_dict(), 400

        rag_result = rag_pipeline(question)

        or_ = engine.check_output(rag_result["answer"], question)
        if not or_.passed:
            return or_.to_dict(), 200  # return with blocked=True, no hard error
    """

    def check_input(self, question: str) -> GuardrailResult:
        t0 = time.monotonic()

        # --- Tier 1 (instant) ---
        max_chars = int(_policy("max_input_chars", 2000))
        result = _check_length(question, max_chars)
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            return result

        result = _check_patterns(
            question, "jailbreak", "check_jailbreak",
            float(_policy("jailbreak_risk_score", 0.85)),
            "I'm only able to help with software testing, QA, and defect management questions. "
            "Please rephrase your question.",
        )
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            self._maybe_alert(result)
            return result

        result = _check_patterns(
            question, "prompt_injection", "check_prompt_injection",
            float(_policy("injection_risk_score", 0.95)),
            "Your message contains content that cannot be processed. Please try again with a regular question.",
        )
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            self._maybe_alert(result)
            return result

        result = _check_patterns(
            question, "pii_request", "check_pii_request",
            float(_policy("pii_risk_score", 0.90)),
            "I cannot provide credentials, API keys, or sensitive configuration data. "
            "Please ask about test cases, defects, or QA processes instead.",
        )
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            return result

        # --- Tier 2 (LLM topical check — only if Tier 1 passes) ---
        is_on_topic, confidence = _llm_off_topic_check(question)
        if not is_on_topic and confidence >= (1.0 - float(_policy("off_topic_llm_threshold", 0.35))):
            result = GuardrailResult(
                passed=False,
                rail_triggered="check_off_topic",
                risk_score=float(_policy("off_topic_risk_score", 0.70)) * confidence,
                blocked_reason=f"Question appears off-topic (confidence={confidence:.2f})",
                safe_message=(
                    "I'm a QA-focused assistant. I can help with test cases, defects, "
                    "Jira stories, code coverage, and CI/CD pipelines. "
                    "Please rephrase your question in that context."
                ),
                latency_ms=int((time.monotonic() - t0) * 1000),
            )
            return result

        return GuardrailResult(
            passed=True,
            risk_score=0.0,
            latency_ms=int((time.monotonic() - t0) * 1000),
        )

    def check_output(self, answer: str, question: str = "") -> GuardrailResult:
        t0 = time.monotonic()

        # Length check
        max_chars = int(_policy("max_output_chars", 6000))
        if len(answer) > max_chars:
            answer = answer[:max_chars] + "\n\n[Response truncated by output rail]"

        result = _check_output_patterns(answer, "pii_patterns", "check_pii_output")
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            return result

        result = _check_output_patterns(answer, "sensitive_disclosure", "check_sensitive_disclosure")
        if result:
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            return result

        return GuardrailResult(
            passed=True,
            risk_score=0.0,
            latency_ms=int((time.monotonic() - t0) * 1000),
        )

    @staticmethod
    def _maybe_alert(result: GuardrailResult) -> None:
        """Log high-risk blocks. (Email alerting would plug in here.)"""
        if result.risk_score >= float(_policy("jailbreak_risk_score", 0.85)):
            logger.critical(
                "[guardrails] HIGH-RISK block — rail=%s score=%.2f reason=%s",
                result.rail_triggered, result.risk_score, result.blocked_reason,
            )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_engine: GuardrailsEngine | None = None


def get_engine() -> GuardrailsEngine:
    global _engine
    if _engine is None:
        _engine = GuardrailsEngine()
        logger.info("[guardrails] engine initialised from %s", _CONFIG_PATH)
    return _engine
