CREATE TABLE gap_reports (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    gap_category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    priority_score DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    affected_requirement TEXT,
    existing_coverage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_gap_reports_run ON gap_reports(pipeline_run_id);
