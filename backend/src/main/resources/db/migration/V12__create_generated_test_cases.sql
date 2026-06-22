CREATE TABLE generated_test_cases (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    gap_report_id BIGINT REFERENCES gap_reports(id),
    title VARCHAR(500) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    gap_category VARCHAR(50),
    preconditions TEXT,
    test_steps JSONB NOT NULL,
    expected_result TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reviewer_notes TEXT,
    reviewed_by BIGINT REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_test_cases_run ON generated_test_cases(pipeline_run_id);
CREATE INDEX idx_test_cases_status ON generated_test_cases(status);
