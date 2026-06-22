"""
Unit tests for the IsolationForest risk-scoring logic in score_risk node.

Run with:  pytest tests/test_isolation_forest.py -v
"""

import sys
import os
import numpy as np
import pytest

# Make agents importable when running from ai-engine root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.langgraph_agent import _extract_features, score_risk, AgentState


# ---------------------------------------------------------------------------
# Feature extraction tests
# ---------------------------------------------------------------------------
class TestFeatureExtraction:
    def _make_file(self, content: str, lines_changed: int = 10) -> dict:
        return {"path": "src/app.py", "content": content, "diff": "", "lines_changed": lines_changed}

    def test_import_count_python(self):
        content = "import os\nimport sys\nfrom pathlib import Path\nx = 1"
        features = _extract_features(self._make_file(content))
        assert features[2] == 3.0, f"Expected 3 imports, got {features[2]}"

    def test_import_count_js(self):
        content = "const fs = require('fs');\nconst path = require('path');\nconst x = 1;"
        features = _extract_features(self._make_file(content))
        assert features[2] == 2.0

    def test_function_count_python(self):
        content = "def foo():\n    pass\n\ndef bar():\n    pass\n"
        features = _extract_features(self._make_file(content))
        assert features[3] == 2.0

    def test_function_count_js_arrow(self):
        content = "const fn = () => { return 1; };\nconst fn2 = async () => {};"
        features = _extract_features(self._make_file(content))
        assert features[3] >= 2.0

    def test_has_auth_code_detected(self):
        content = "def verify_token(token):\n    if not token:\n        raise ValueError('Missing token')"
        features = _extract_features(self._make_file(content))
        assert features[4] == 1.0, "Should detect 'token' as auth code"

    def test_has_auth_code_not_detected(self):
        content = "def calculate_total(items):\n    return sum(item.price for item in items)"
        features = _extract_features(self._make_file(content))
        assert features[4] == 0.0

    def test_has_db_code_detected(self):
        content = 'result = session.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})'
        features = _extract_features(self._make_file(content))
        assert features[5] == 1.0

    def test_has_db_code_repository(self):
        content = "userRepository.save(newUser);\nawait this.userRepository.find();"
        features = _extract_features(self._make_file(content))
        assert features[5] == 1.0

    def test_has_db_code_not_present(self):
        content = "def render_template(name):\n    return templates.get(name, '')"
        features = _extract_features(self._make_file(content))
        assert features[5] == 0.0

    def test_lines_changed_propagated(self):
        content = "x = 1"
        features = _extract_features(self._make_file(content, lines_changed=250))
        assert features[0] == 250.0

    def test_file_size_kb(self):
        content = "a" * 2048  # 2 KB
        features = _extract_features(self._make_file(content))
        assert abs(features[1] - 2.0) < 0.1

    def test_coverage_delta_placeholder_zero(self):
        content = "def foo(): pass"
        features = _extract_features(self._make_file(content))
        assert features[6] == 0.0

    def test_feature_vector_length(self):
        content = "import os\ndef f(): pass"
        features = _extract_features(self._make_file(content))
        assert len(features) == 7

    def test_empty_file(self):
        features = _extract_features(self._make_file("", lines_changed=0))
        assert features == [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]


# ---------------------------------------------------------------------------
# IsolationForest scoring tests
# ---------------------------------------------------------------------------
class TestIsolationForest:
    def _base_state(self, file_list: list[dict]) -> AgentState:
        return AgentState(
            run_id="test-run",
            project_id=1,
            repo_url="https://github.com/owner/repo",
            github_token="token",
            commit_sha="abc123",
            file_list=file_list,
            risk_scores=[],
            coverage_gaps=[],
            generated_tests=[],
            defects=[],
            explained_defects=[],
            dispatch_results={},
            error="",
            status="SCORING_RISK",
        )

    def _make_high_complexity_file(self, path: str = "src/auth_service.py") -> dict:
        """Simulate a large, complex auth file that should be flagged as high-risk."""
        content = (
            "import os\nimport sys\nimport hashlib\nimport jwt\nimport requests\n"
            "import sqlalchemy\nfrom db import repository\n\n"
            + "def authenticate_user(token, password, login):\n    pass\n\n" * 40
            + "# TODO: add validation\n"
            + "result = session.execute('SELECT * FROM users WHERE id = :id')\n"
        )
        return {"path": path, "content": content, "diff": "", "lines_changed": 400}

    def _make_simple_file(self, path: str = "src/utils.py") -> dict:
        """Simulate a tiny, simple utility file."""
        content = "def add(a, b):\n    return a + b\n\ndef subtract(a, b):\n    return a - b\n"
        return {"path": path, "content": content, "diff": "", "lines_changed": 5}

    def test_scores_are_normalized_between_0_and_1(self):
        files = [self._make_simple_file(f"src/util_{i}.py") for i in range(8)]
        files.append(self._make_high_complexity_file())
        state = self._base_state(files)
        result = score_risk(state)

        assert result["error"] == "", f"Unexpected error: {result['error']}"
        for rs in result["risk_scores"]:
            assert 0.0 <= rs["score"] <= 1.0, f"Score out of range: {rs['score']}"

    def test_high_complexity_file_has_high_risk_score(self):
        files = [self._make_simple_file(f"src/util_{i}.py") for i in range(8)]
        files.append(self._make_high_complexity_file("src/auth_service.py"))
        state = self._base_state(files)
        result = score_risk(state)

        score_map = {r["file_path"]: r["score"] for r in result["risk_scores"]}
        auth_score = score_map.get("src/auth_service.py", 0.0)
        simple_scores = [score_map[f"src/util_{i}.py"] for i in range(8)]
        avg_simple = sum(simple_scores) / len(simple_scores)

        assert auth_score > avg_simple, (
            f"Expected auth_service.py ({auth_score:.4f}) to score higher than "
            f"simple utils ({avg_simple:.4f})"
        )

    def test_anomaly_flag_set_for_outlier(self):
        # With contamination=0.1, at least 1 in 10 should be flagged
        files = [self._make_simple_file(f"src/util_{i}.py") for i in range(9)]
        files.append(self._make_high_complexity_file())
        state = self._base_state(files)
        result = score_risk(state)

        anomalies = [r for r in result["risk_scores"] if r["anomaly_flag"]]
        assert len(anomalies) >= 1, "Expected at least one anomaly to be flagged"

    def test_normal_files_low_risk_score(self):
        # All similar simple files — scores should all be low / similar
        files = [self._make_simple_file(f"src/util_{i}.py") for i in range(10)]
        state = self._base_state(files)
        result = score_risk(state)

        scores = [r["score"] for r in result["risk_scores"]]
        # All scores should be close to each other (low variance)
        score_range = max(scores) - min(scores)
        # With identical files the range is 0; with tiny noise still small
        assert score_range < 0.5, f"Expected low score variance for uniform files, got range={score_range:.4f}"

    def test_empty_file_list_returns_empty_scores(self):
        state = self._base_state([])
        result = score_risk(state)
        assert result["risk_scores"] == []
        assert result["error"] == ""

    def test_single_file_does_not_crash(self):
        state = self._base_state([self._make_high_complexity_file()])
        result = score_risk(state)
        assert len(result["risk_scores"]) == 1
        assert 0.0 <= result["risk_scores"][0]["score"] <= 1.0

    def test_risk_scores_sorted_descending(self):
        files = [self._make_simple_file(f"src/util_{i}.py") for i in range(8)]
        files.append(self._make_high_complexity_file())
        state = self._base_state(files)
        result = score_risk(state)

        scores = [r["score"] for r in result["risk_scores"]]
        assert scores == sorted(scores, reverse=True), "Risk scores should be sorted descending"

    def test_features_included_in_output(self):
        state = self._base_state([self._make_high_complexity_file()])
        result = score_risk(state)

        rs = result["risk_scores"][0]
        assert "features" in rs
        expected_keys = {"lines_changed", "file_size_kb", "import_count", "function_count", "has_auth_code", "has_db_code"}
        assert expected_keys.issubset(rs["features"].keys())

    def test_status_updated_to_scoring_risk(self):
        state = self._base_state([self._make_simple_file()])
        result = score_risk(state)
        assert result["status"] == "SCORING_RISK"

    def test_score_nan_inf_handled_gracefully(self):
        """Files with bizarre content should not crash the scorer."""
        weird_file = {
            "path": "src/weird.py",
            "content": "\x00\x01\x02binary\xff\xfe",
            "diff": "",
            "lines_changed": 0,
        }
        state = self._base_state([weird_file] + [self._make_simple_file(f"src/u{i}.py") for i in range(5)])
        result = score_risk(state)
        assert result["error"] == "", "Should not error on weird file content"
        for rs in result["risk_scores"]:
            assert not (rs["score"] != rs["score"]), "Score must not be NaN"
