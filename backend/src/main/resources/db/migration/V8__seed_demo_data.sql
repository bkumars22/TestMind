-- Demo admin user: admin@testmind.io / Admin@2026
-- BCrypt hash of 'Admin@2026' with cost 12
INSERT INTO users (email, password_hash, role, created_at) VALUES
('admin@testmind.io', '$2a$12$LJfCe0kRKmqnPb3O9JH.S.rXaHzpQlmjFhKTq1.e8t3bF4Y9hSwQy', 'ADMIN', NOW()),
('qa@testmind.io',    '$2a$12$LJfCe0kRKmqnPb3O9JH.S.rXaHzpQlmjFhKTq1.e8t3bF4Y9hSwQy', 'QA_LEAD', NOW());

-- Demo project (ARIA — the app we already know)
INSERT INTO projects (name, repo_url, user_id, created_at) VALUES
('ARIA Demo', 'https://github.com/bkumars22/ARIA', 1, NOW() - INTERVAL '3 days'),
('Spring Boot API', 'https://github.com/example/spring-api', 1, NOW() - INTERVAL '1 day');

-- Demo test runs
INSERT INTO test_runs (project_id, status, triggered_by, started_at, completed_at, defect_count, risk_score) VALUES
(1, 'COMPLETED', 'admin@testmind.io', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes', 3, 0.72),
(1, 'COMPLETED', 'admin@testmind.io', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'  + INTERVAL '3 minutes', 1, 0.45),
(2, 'RUNNING',   'qa@testmind.io',    NOW() - INTERVAL '5 minutes', NULL, 0, NULL);

-- Demo defects
INSERT INTO defects (test_run_id, severity, title, description, ai_explanation, consistency_score, status, created_at) VALUES
(1, 'P1', 'JWT token not invalidated on logout',
 'The /api/auth/logout endpoint does not invalidate the JWT token server-side.',
 'What broke: JWT tokens remain valid after logout until natural expiry (24h).\n\nWhy it matters: A stolen token can be used by an attacker even after the user logs out.\n\nRoot cause: No token blacklist or token versioning implemented.\n\nSteps to reproduce:\n1. Login and capture JWT token\n2. Call /api/auth/logout\n3. Use captured token on /api/projects — expect 401, get 200\n\nSuggested fix: Implement a Redis-based token blacklist or rotate secrets per user on logout.',
 0.94, 'OPEN', NOW() - INTERVAL '2 days'),
(1, 'P2', 'Risk heatmap returns empty array for new projects',
 'GET /api/dashboard/risk-heatmap returns [] when project has no test runs.',
 'What broke: Dashboard shows empty heatmap for new projects instead of a helpful empty state.\n\nWhy it matters: Users think the feature is broken.\n\nRoot cause: Query returns null when no risk_scores records exist; service does not handle empty result.\n\nSteps to reproduce: Create a new project, open dashboard, observe heatmap is blank with no message.\n\nSuggested fix: Return a descriptive message or empty-state indicator when no risk scores exist.',
 0.91, 'IN_PROGRESS', NOW() - INTERVAL '2 days'),
(1, 'P3', 'Swagger UI not accessible in production',
 '/swagger-ui.html returns 403 when deployed behind nginx.',
 'What broke: API docs blocked in production.\n\nWhy it matters: External QA engineers cannot explore the API.\n\nRoot cause: Nginx default config blocks non-standard paths.\n\nSuggested fix: Add /swagger-ui.html to nginx allow list or expose on internal network only.',
 0.87, 'RESOLVED', NOW() - INTERVAL '2 days'),
(2, 'P2', 'File upload size limit not enforced',
 'Large PDF uploads (>50MB) cause OOM on the AI engine container.',
 'What broke: AI engine crashes on large document uploads.\n\nWhy it matters: Service outage for all users when one uploads a large file.\n\nRoot cause: No multipart size limit in Spring Boot or nginx config.\n\nSuggested fix: Set spring.servlet.multipart.max-file-size=10MB and nginx client_max_body_size 10m.',
 0.89, 'OPEN', NOW() - INTERVAL '1 day');

-- Demo risk scores
INSERT INTO risk_scores (project_id, file_path, risk_score, anomaly_flag, commit_sha, scored_at) VALUES
(1, 'backend/src/main/java/com/testmind/security/JwtUtil.java', 0.87, TRUE,  'abc1234', NOW() - INTERVAL '2 days'),
(1, 'backend/src/main/java/com/testmind/service/AuthService.java', 0.81, TRUE,  'abc1234', NOW() - INTERVAL '2 days'),
(1, 'ai-engine/agents/langgraph_agent.py', 0.74, TRUE,  'abc1234', NOW() - INTERVAL '2 days'),
(1, 'frontend/src/services/api.ts', 0.42, FALSE, 'abc1234', NOW() - INTERVAL '2 days'),
(1, 'backend/src/main/java/com/testmind/controller/ProjectController.java', 0.38, FALSE, 'abc1234', NOW() - INTERVAL '2 days'),
(1, 'frontend/src/pages/DashboardPage.tsx', 0.21, FALSE, 'abc1234', NOW() - INTERVAL '2 days');

-- MCP connections for demo project
INSERT INTO mcp_connections (project_id, server_type, is_active) VALUES
(1, 'PLAYWRIGHT', TRUE),
(1, 'GITHUB',     TRUE),
(1, 'FILESYSTEM', TRUE),
(1, 'JIRA',       FALSE),
(1, 'SLACK',      FALSE);
