-- Add tech_stack, status, updated_at columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_stack VARCHAR(512);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Assign SCIP and ARIA to the admin user (seeded in V8)
UPDATE projects
SET user_id = (SELECT id FROM users WHERE email = 'admin@testmind.io' LIMIT 1)
WHERE user_id IS NULL;

-- Set tech_stack and status for SCIP
UPDATE projects
SET tech_stack  = 'Java 17 + Spring Boot 3 + React 18 + Python FastAPI + IsolationForest + LangGraph + PostgreSQL',
    status      = 'ACTIVE',
    updated_at  = NOW()
WHERE repo_url = 'https://github.com/bkumars22/SupplyChainPlatformProject';

-- Set tech_stack and status for ARIA
UPDATE projects
SET tech_stack  = 'Claude AI + LangGraph + React 18 + Spring Boot + Python FastAPI + Whisper STT + PostgreSQL',
    status      = 'ACTIVE',
    updated_at  = NOW()
WHERE repo_url = 'https://github.com/bkumars22/ARIA';

-- Set status for any other existing projects
UPDATE projects SET status = 'ACTIVE', updated_at = NOW() WHERE status IS NULL;

-- Seed QA_ENGINEER user
INSERT INTO users (email, password_hash, role, created_at)
SELECT 'engineer@qaip.io',
       '$2a$12$LJfCe0kRKmqnPb3O9JH.S.rXaHzpQlmjFhKTq1.e8t3bF4Y9hSwQy',
       'QA_ENGINEER',
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'engineer@qaip.io');

-- Seed VIEWER user
INSERT INTO users (email, password_hash, role, created_at)
SELECT 'viewer@qaip.io',
       '$2a$12$LJfCe0kRKmqnPb3O9JH.S.rXaHzpQlmjFhKTq1.e8t3bF4Y9hSwQy',
       'VIEWER',
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'viewer@qaip.io');
