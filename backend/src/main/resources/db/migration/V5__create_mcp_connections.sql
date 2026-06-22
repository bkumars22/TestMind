CREATE TABLE mcp_connections (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    server_type VARCHAR(20) NOT NULL,
    config_json TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(project_id, server_type)
);

CREATE INDEX idx_mcp_connections_project_id ON mcp_connections(project_id);
