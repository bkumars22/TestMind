CREATE TABLE story_analysis (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    jira_story_id VARCHAR(100) NOT NULL,
    jira_summary TEXT,
    business_rules JSONB,
    acceptance_criteria JSONB,
    edge_cases JSONB,
    data_rules JSONB,
    raw_story JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
