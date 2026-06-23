import type { Project, TestRun, Defect, RiskScore, McpStatus, DashboardStats } from '../types';

export const DEMO_TOKEN = 'demo-token-qaip-2026';

export const mockProjects: Project[] = [
  {
    id: 1,
    name: 'SCIP — Supply Chain Intelligence Platform',
    repoUrl: 'https://github.com/bkumars22/SupplyChainPlatformProject',
    techStack: 'Java 17 + Spring Boot + React 18 + Python FastAPI + IsolationForest + PostgreSQL',
    status: 'ACTIVE',
    githubToken: '',
    createdAt: '2026-01-10T09:00:00Z',
    activeTestRun: false,
  },
  {
    id: 2,
    name: 'ARIA — Adaptive Real-time Intelligence for Anyone',
    repoUrl: 'https://github.com/bkumars22/ARIA',
    techStack: 'Claude AI + LangGraph + React 18 + Spring Boot + FastAPI + Whisper STT + PostgreSQL',
    status: 'ACTIVE',
    githubToken: '',
    createdAt: '2026-01-15T10:30:00Z',
    activeTestRun: false,
  },
];

export const mockTestRuns: Record<number, TestRun[]> = {
  1: [
    {
      id: 101,
      projectId: 1,
      status: 'COMPLETED',
      triggeredBy: 'admin@qaip.io',
      startedAt: '2026-06-20T08:00:00Z',
      completedAt: '2026-06-20T08:14:22Z',
      defectCount: 3,
      riskScore: 0.72,
    },
    {
      id: 102,
      projectId: 1,
      status: 'COMPLETED',
      triggeredBy: 'webhook/github',
      startedAt: '2026-06-18T14:30:00Z',
      completedAt: '2026-06-18T14:43:10Z',
      defectCount: 1,
      riskScore: 0.45,
    },
  ],
  2: [
    {
      id: 201,
      projectId: 2,
      status: 'COMPLETED',
      triggeredBy: 'admin@qaip.io',
      startedAt: '2026-06-21T10:00:00Z',
      completedAt: '2026-06-21T10:11:55Z',
      defectCount: 2,
      riskScore: 0.61,
    },
    {
      id: 202,
      projectId: 2,
      status: 'COMPLETED',
      triggeredBy: 'webhook/github',
      startedAt: '2026-06-19T16:00:00Z',
      completedAt: '2026-06-19T16:09:30Z',
      defectCount: 0,
      riskScore: 0.31,
    },
  ],
};

export const mockDefects: Record<number, Defect[]> = {
  101: [
    {
      id: 1001,
      testRunId: 101,
      severity: 'P0',
      title: 'Null password input returns HTTP 500 instead of 400',
      description: 'POST /api/auth/login with password: null causes a NullPointerException in BCryptPasswordEncoder, returning an unhandled 500 error.',
      aiExplanation: 'Root cause: UserAuthController passes the raw password field directly to BCryptPasswordEncoder.matches() without a null guard. BCrypt throws NullPointerException on null input. Business impact: Any automated scanner can fingerprint this endpoint by triggering 500 vs 400 responses, revealing internal stack traces. Fix: Add @NotNull validation on the LoginRequest DTO and catch the NPE in the controller with a 400 response.',
      consistencyScore: 0.94,
      jiraTicketId: 'SCIP-441',
      status: 'OPEN',
      createdAt: '2026-06-20T08:14:22Z',
    },
    {
      id: 1002,
      testRunId: 101,
      severity: 'P1',
      title: 'VIEWER role can access /api/admin/users endpoint',
      description: 'GET /api/admin/users returns 200 when called with a VIEWER JWT. RBAC annotation @PreAuthorize("hasRole(ADMIN)") is missing on the handler.',
      aiExplanation: 'Root cause: AdminUserController.listUsers() method is missing the @PreAuthorize annotation. Spring Security defaults to permitAll when no method-level security is declared. Business impact: Any authenticated user can enumerate all user accounts including emails and roles, violating least-privilege. Fix: Add @PreAuthorize("hasRole(\'ADMIN\')") to the listUsers() method and add a VIEWER token test to the security test suite.',
      consistencyScore: 0.91,
      jiraTicketId: 'SCIP-442',
      status: 'IN_PROGRESS',
      createdAt: '2026-06-20T08:14:22Z',
    },
    {
      id: 1003,
      testRunId: 101,
      severity: 'P2',
      title: 'IsolationForest returns empty scores for newly added files',
      description: 'Files added within the last 3 commits return riskScore: null from the ML model. The model requires at least 5 commits of history per file.',
      aiExplanation: 'Root cause: IsolationForest is fitted only on files with commit history >= 5. New files fall outside the training window and the API returns null instead of a default score. Business impact: New files — which are statistically higher risk — are invisible to the risk heatmap. Fix: Return a default risk score of 0.5 for files with insufficient history, and add a "new file" flag in the response.',
      consistencyScore: 0.87,
      jiraTicketId: undefined,
      status: 'OPEN',
      createdAt: '2026-06-20T08:14:22Z',
    },
  ],
  102: [
    {
      id: 1004,
      testRunId: 102,
      severity: 'P2',
      title: 'Supplier risk score cached for 24h ignores intra-day updates',
      description: 'Redis TTL for supplier risk scores is set to 86400s. Supply chain disruption events within the same day are not reflected until cache expiry.',
      aiExplanation: 'Root cause: SupplierRiskService uses @Cacheable with a fixed 24-hour TTL. The IsolationForest model re-runs on each webhook event but the cached score is served from Redis without re-validation. Business impact: Procurement decisions made during the cache window may be based on stale risk data, creating financial exposure. Fix: Reduce TTL to 3600s for high-risk suppliers (score > 0.7) and implement cache eviction on webhook ingestion.',
      consistencyScore: 0.89,
      jiraTicketId: undefined,
      status: 'OPEN',
      createdAt: '2026-06-18T14:43:10Z',
    },
  ],
  201: [
    {
      id: 2001,
      testRunId: 201,
      severity: 'P0',
      title: 'Socratic engine gives direct answer when student applies pressure',
      description: 'When student sends "Just tell me the answer directly" 3 times in a row, the Socratic engine\'s system prompt guard is bypassed and a direct answer is returned.',
      aiExplanation: 'Root cause: The Socratic constraint is enforced in the first system message only. Repeated adversarial prompts cause the LLM to treat the instruction as overridden by user intent in the conversation context. Business impact: Core pedagogical guarantee is violated — students can bypass guided learning entirely, undermining the product\'s educational value proposition. Fix: Re-inject the Socratic system prompt on every API call, not just session start. Add a post-response validator that detects direct answers and replaces them with a guided question.',
      consistencyScore: 0.96,
      jiraTicketId: 'ARIA-88',
      status: 'OPEN',
      createdAt: '2026-06-21T10:11:55Z',
    },
    {
      id: 2002,
      testRunId: 201,
      severity: 'P1',
      title: 'Adaptive difficulty does not drop below 35% accuracy threshold',
      description: 'When student scores below 35% for 3 consecutive sessions, difficulty level remains at current setting instead of stepping down to Beginner.',
      aiExplanation: 'Root cause: AdaptiveDifficultyService.evaluate() checks the rolling average across 5 sessions, not 3. The threshold comparison uses > instead of >=, so exactly 35% does not trigger a step-down. Business impact: Struggling students receive content that is too hard, leading to disengagement and dropout. Fix: Change the window to 3 sessions, change > to >= for the boundary check, and add unit tests for all four threshold boundaries (35%, 50%, 65%, 80%).',
      consistencyScore: 0.92,
      jiraTicketId: 'ARIA-89',
      status: 'IN_PROGRESS',
      createdAt: '2026-06-21T10:11:55Z',
    },
  ],
  202: [],
};

export const mockRiskScores: Record<number, RiskScore[]> = {
  1: [
    { id: 1, projectId: 1, filePath: 'backend/src/main/java/com/scplatform/controller/UserAuthController.java', riskScore: 0.91, anomalyFlag: true, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
    { id: 2, projectId: 1, filePath: 'backend/src/main/java/com/scplatform/security/SecurityConfig.java', riskScore: 0.89, anomalyFlag: true, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
    { id: 3, projectId: 1, filePath: 'backend/src/main/java/com/scplatform/security/JwtTokenProvider.java', riskScore: 0.82, anomalyFlag: true, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
    { id: 4, projectId: 1, filePath: 'ai-engine/services/supplier_risk_service.py', riskScore: 0.67, anomalyFlag: false, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
    { id: 5, projectId: 1, filePath: 'backend/src/main/resources/db/migration/V8__seed_demo_data.sql', riskScore: 0.45, anomalyFlag: false, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
    { id: 6, projectId: 1, filePath: 'frontend/src/pages/SupplierDetailPage.tsx', riskScore: 0.38, anomalyFlag: false, commitSha: 'a1b2c3d', scoredAt: '2026-06-20T08:00:00Z' },
  ],
  2: [
    { id: 7, projectId: 2, filePath: 'ai-service/engines/socratic_engine.py', riskScore: 0.88, anomalyFlag: true, commitSha: 'e4f5g6h', scoredAt: '2026-06-21T10:00:00Z' },
    { id: 8, projectId: 2, filePath: 'backend/src/main/java/com/aria/service/AdaptiveDifficultyService.java', riskScore: 0.76, anomalyFlag: true, commitSha: 'e4f5g6h', scoredAt: '2026-06-21T10:00:00Z' },
    { id: 9, projectId: 2, filePath: 'backend/src/main/java/com/aria/controller/StudentProgressController.java', riskScore: 0.71, anomalyFlag: false, commitSha: 'e4f5g6h', scoredAt: '2026-06-21T10:00:00Z' },
    { id: 10, projectId: 2, filePath: 'ai-service/tts/multi_language_tts.py', riskScore: 0.54, anomalyFlag: false, commitSha: 'e4f5g6h', scoredAt: '2026-06-21T10:00:00Z' },
    { id: 11, projectId: 2, filePath: 'frontend/src/components/LessonPlayer.tsx', riskScore: 0.29, anomalyFlag: false, commitSha: 'e4f5g6h', scoredAt: '2026-06-21T10:00:00Z' },
  ],
};

export const mockMcpStatus: Record<number, McpStatus[]> = {
  1: [
    { serverType: 'PLAYWRIGHT', isActive: true, lastChecked: '2026-06-20T08:00:00Z' },
    { serverType: 'GITHUB', isActive: true, lastChecked: '2026-06-20T08:00:00Z' },
    { serverType: 'FILESYSTEM', isActive: true, lastChecked: '2026-06-20T08:00:00Z' },
    { serverType: 'JIRA', isActive: true, lastChecked: '2026-06-20T08:00:00Z' },
    { serverType: 'SLACK', isActive: false, lastChecked: '2026-06-20T08:00:00Z' },
  ],
  2: [
    { serverType: 'PLAYWRIGHT', isActive: true, lastChecked: '2026-06-21T10:00:00Z' },
    { serverType: 'GITHUB', isActive: true, lastChecked: '2026-06-21T10:00:00Z' },
    { serverType: 'FILESYSTEM', isActive: true, lastChecked: '2026-06-21T10:00:00Z' },
    { serverType: 'JIRA', isActive: true, lastChecked: '2026-06-21T10:00:00Z' },
    { serverType: 'SLACK', isActive: true, lastChecked: '2026-06-21T10:00:00Z' },
  ],
};

export const mockDashboardStats: DashboardStats = {
  totalProjects: 2,
  activeTestRuns: 0,
  openDefects: 4,
  avgRiskScore: 0.68,
};

export function getAllMockDefects(): Defect[] {
  return Object.values(mockDefects).flat();
}

export function getMockTestRun(id: number): TestRun | undefined {
  return Object.values(mockTestRuns).flat().find((r) => r.id === id);
}

export function getMockDefect(id: number): Defect | undefined {
  return getAllMockDefects().find((d) => d.id === id);
}
