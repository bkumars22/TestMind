-- Seed SCIP and ARIA as pre-registered projects in QAIP
-- Uses only columns that exist in V1 schema; tech_stack/status added by V21

INSERT INTO projects (name, repo_url, created_at)
SELECT 'SCIP — Supply Chain Intelligence Platform',
       'https://github.com/bkumars22/SupplyChainPlatformProject',
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE repo_url = 'https://github.com/bkumars22/SupplyChainPlatformProject'
);

INSERT INTO projects (name, repo_url, created_at)
SELECT 'ARIA — Adaptive Real-time Intelligence for Anyone',
       'https://github.com/bkumars22/ARIA',
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE repo_url = 'https://github.com/bkumars22/ARIA'
);
