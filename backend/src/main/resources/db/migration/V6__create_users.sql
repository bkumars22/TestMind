CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'QA_ENGINEER',
    project_id    BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add FK from projects to users (deferred — users table now exists)
ALTER TABLE projects ADD CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_email ON users(email);
