CREATE TABLE pipeline_runs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    jira_story_id VARCHAR(100) NOT NULL,
    jira_summary TEXT,
    status VARCHAR(60) NOT NULL DEFAULT 'STAGE_1_INGESTING',
    current_stage INT NOT NULL DEFAULT 1,
    created_by BIGINT REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    report_url TEXT,
    error_message TEXT
);
CREATE INDEX idx_pipeline_runs_project ON pipeline_runs(project_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
