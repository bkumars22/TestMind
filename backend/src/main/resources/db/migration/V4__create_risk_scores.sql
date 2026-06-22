CREATE TABLE risk_scores (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path    VARCHAR(1024) NOT NULL,
    risk_score   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
    commit_sha   VARCHAR(40),
    scored_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_project_id ON risk_scores(project_id);
CREATE INDEX idx_risk_scores_score ON risk_scores(risk_score DESC);
