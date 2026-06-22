CREATE TABLE generated_code (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id BIGINT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    test_case_id BIGINT REFERENCES generated_test_cases(id),
    framework VARCHAR(50) NOT NULL,
    language VARCHAR(30) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    code_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
