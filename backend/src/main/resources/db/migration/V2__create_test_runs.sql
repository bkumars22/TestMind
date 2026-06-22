CREATE TABLE test_runs (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    triggered_by VARCHAR(255),
    started_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    defect_count INTEGER NOT NULL DEFAULT 0,
    risk_score   DOUBLE PRECISION
);

CREATE INDEX idx_test_runs_project_id ON test_runs(project_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
