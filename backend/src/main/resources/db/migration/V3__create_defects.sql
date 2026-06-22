CREATE TABLE defects (
    id                BIGSERIAL PRIMARY KEY,
    test_run_id       BIGINT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    severity          VARCHAR(10) NOT NULL,
    title             VARCHAR(512) NOT NULL,
    description       TEXT,
    ai_explanation    TEXT,
    consistency_score DOUBLE PRECISION,
    jira_ticket_id    VARCHAR(100),
    status            VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_defects_test_run_id ON defects(test_run_id);
CREATE INDEX idx_defects_severity ON defects(severity);
CREATE INDEX idx_defects_status ON defects(status);
