"""
Bridge to D:\KumarFolder\Agents — the user's production QA agents.

Stage mapping:
  Stage 1 (ingest_story)   → agent7_story_analyzer.py  --story=<ID>
  Stage 2 (analyze_gaps)   → agent8_gap_analyzer.py    --story=<ID>
  Stage 3 (generate_tests) → agent25_playwright_generator.py --phase 3
  Stage 7 (jira_dispatch)  → agent3_jira_creator.py    agents/parsed_results.json

Each function returns a dict on success or None on failure.
The pipeline nodes call try_agent_X() first; if None, they fall back to Groq logic.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger("qaip.real_agents")

# Location of the user's agent folder
AGENTS_DIR = Path(os.getenv("REAL_AGENTS_DIR", r"D:\KumarFolder\Agents"))
PYTHON = sys.executable  # use same Python interpreter


def _run_agent(script: str, args: list[str], cwd: Path | None = None, timeout: int = 120) -> bool:
    """Run an agent script as subprocess. Returns True on exit 0."""
    script_path = AGENTS_DIR / script
    if not script_path.exists():
        logger.warning("Real agent not found: %s", script_path)
        return False
    try:
        result = subprocess.run(
            [PYTHON, str(script_path)] + args,
            cwd=str(cwd or AGENTS_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.warning("Agent %s exited %d: %s", script, result.returncode, result.stderr[:300])
            return False
        logger.info("Agent %s completed successfully", script)
        return True
    except subprocess.TimeoutExpired:
        logger.warning("Agent %s timed out after %ds", script, timeout)
        return False
    except Exception as e:
        logger.warning("Agent %s failed: %s", script, e)
        return False


def _read_json(path: Path) -> dict | list | None:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.debug("Could not read %s: %s", path, e)
        return None


# ─── Stage 1: Story Ingestion via agent7 ─────────────────────────────────────

def try_ingest_story(story_id: str) -> dict | None:
    """
    Run agent7_story_analyzer.py --story=<ID> --no-launch.
    Reads agents/story_setup.json output.
    Returns structured story dict or None.
    """
    if not (AGENTS_DIR / "agent7_story_analyzer.py").exists():
        return None

    ok = _run_agent("agent7_story_analyzer.py", [f"--story={story_id}", "--no-launch"], timeout=180)
    if not ok:
        return None

    data = _read_json(AGENTS_DIR / "story_setup.json")
    if not data:
        return None

    # Map agent7 output to our pipeline format
    story = data if isinstance(data, dict) else {}
    return {
        "jira_story_id": story_id,
        "jira_summary": story.get("summary", story.get("jira_summary", "")),
        "business_rules": story.get("business_rules", []),
        "acceptance_criteria": _normalise_acs(story.get("acceptance_criteria", [])),
        "edge_cases": story.get("edge_cases", []),
        "data_rules": story.get("data_rules", story.get("test_data_rules", [])),
        "security_concerns": story.get("security_concerns", []),
        "test_scope": story.get("test_scope", story.get("description", "")),
        "raw_story": story,
        "_source": "agent7",
    }


def _normalise_acs(acs: list | None) -> list[dict]:
    if not acs:
        return []
    result = []
    for i, ac in enumerate(acs):
        if isinstance(ac, dict):
            result.append(ac)
        elif isinstance(ac, str):
            result.append({"id": f"AC{i+1}", "given": "", "when": "", "then": ac})
    return result


# ─── Stage 2: Gap Analysis via agent8 ────────────────────────────────────────

def try_analyze_gaps(story_id: str, code_paths: list[str] | None = None) -> list[dict] | None:
    """
    Run agent8_gap_analyzer.py --story=<ID>.
    Reads agents/gap_report.json output.
    Returns list of gap dicts or None.
    """
    if not (AGENTS_DIR / "agent8_gap_analyzer.py").exists():
        return None

    args = [f"--story={story_id}"]
    if code_paths:
        for cp in code_paths:
            args.append(f"--code-path={cp}")

    ok = _run_agent("agent8_gap_analyzer.py", args, timeout=180)
    if not ok:
        return None

    # agent8 may output gap_report.json or gap_analysis.json
    data = _read_json(AGENTS_DIR / "gap_report.json") or _read_json(AGENTS_DIR / "gap_analysis.json")
    if not data:
        return None

    gaps = data if isinstance(data, list) else data.get("gaps", [])
    result = []
    for g in gaps:
        if not isinstance(g, dict):
            continue
        # Map agent8 gap types to our GapCategory enum
        raw_type = str(g.get("type", g.get("gap_type", "FUNCTIONAL"))).upper()
        category = _map_gap_type(raw_type)
        result.append({
            "gap_category": category,
            "description": g.get("description", g.get("detail", str(g))),
            "priority_score": _parse_priority(g.get("severity", g.get("priority", "MEDIUM"))),
            "affected_requirement": g.get("requirement", g.get("ac_id", "")),
            "existing_coverage": g.get("coverage", "None"),
            "_source": "agent8",
        })
    return result if result else None


def _map_gap_type(raw: str) -> str:
    mapping = {
        "FUNC": "FUNCTIONAL", "FUNCTIONAL": "FUNCTIONAL",
        "TEST": "FUNCTIONAL", "TECH": "TECHNICAL", "TECHNICAL": "TECHNICAL",
        "DOC": "FUNCTIONAL", "DATA": "DATA", "SECURITY": "SECURITY",
        "BUSINESS": "BUSINESS",
    }
    return mapping.get(raw, "FUNCTIONAL")


def _parse_priority(value: str | float | None) -> float:
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    sev_map = {"CRITICAL": 0.95, "HIGH": 0.85, "MEDIUM": 0.6, "LOW": 0.35}
    return sev_map.get(str(value).upper(), 0.5)


# ─── Stage 4: Playwright Execution via agent25 ────────────────────────────────

def try_execute_playwright(target_url: str, test_dir: str | None = None) -> list[dict] | None:
    """
    Run agent25_playwright_generator.py --url <target_url> --phase 4.
    Reads playwright_failures.json output.
    Returns list of execution result dicts or None.
    """
    if not (AGENTS_DIR / "agent25_playwright_generator.py").exists():
        return None

    args = [f"--url={target_url}", "--phase", "4"]
    if test_dir:
        args.append(f"--test-dir={test_dir}")

    ok = _run_agent("agent25_playwright_generator.py", args, timeout=300)
    # agent25 exits non-zero when tests fail — that's expected; check output file

    failures_data = _read_json(AGENTS_DIR / "playwright_failures.json")
    if failures_data is None:
        return None

    failures = failures_data if isinstance(failures_data, list) else failures_data.get("failures", [])
    results = []
    for f in failures:
        results.append({
            "title": f.get("test", f.get("name", "Unknown test")),
            "status": "FAILED",
            "error_message": f.get("error", f.get("message", "")),
            "duration_ms": f.get("duration_ms", None),
            "screenshot_url": f.get("screenshot", None),
            "_source": "agent25",
        })
    return results


# ─── Stage 7: Jira ticket creation via agent3 ────────────────────────────────

def try_create_jira_tickets(parsed_results_path: str | None = None) -> list[str] | None:
    """
    Run agent3_jira_creator.py with parsed_results.json path.
    Returns list of created Jira ticket keys or None.
    """
    if not (AGENTS_DIR / "agent3_jira_creator.py").exists():
        return None

    results_path = parsed_results_path or str(AGENTS_DIR / "parsed_results.json")
    if not Path(results_path).exists():
        return None

    ok = _run_agent("agent3_jira_creator.py", [results_path], timeout=60)
    if not ok:
        return None

    # agent3 doesn't output JSON — return marker that it ran
    return ["created-via-agent3"]
