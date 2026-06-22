CREATE TABLE test_executions (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    test_case_id BIGINT NOT NULL REFERENCES generated_test_cases(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    duration_ms INTEGER,
    screenshot_url TEXT,
    error_message TEXT,
    response_data JSONB,
    ai_explanation TEXT,
    deepeval_score DECIMAL(4,3),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_executions_run ON test_executions(pipeline_run_id);
