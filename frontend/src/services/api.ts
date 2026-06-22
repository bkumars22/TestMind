import axios from 'axios';
import type {
  AuthResponse,
  Project,
  TestRun,
  Defect,
  DefectStatus,
  RiskScore,
  McpStatus,
  DashboardStats,
  McpServerType,
} from '../types';

// Module-level token store — NOT localStorage
let _token: string | null = null;

export function setToken(t: string): void {
  _token = t;
}

export function clearToken(): void {
  _token = null;
}

export function getToken(): string {
  return _token ?? '';
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/projects');
  return data;
}

export async function createProject(payload: {
  name: string;
  repoUrl: string;
  githubToken: string;
}): Promise<Project> {
  const { data } = await api.post<Project>('/projects', payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export async function connectRepo(id: number, token: string): Promise<void> {
  await api.post(`/projects/${id}/connect-repo`, { token });
}

export async function triggerAnalysis(id: number): Promise<{ runId: number }> {
  const { data } = await api.post<{ runId: number }>(`/projects/${id}/analyze`);
  return data;
}

// Test Runs
export async function getTestRuns(projectId: number): Promise<TestRun[]> {
  const { data } = await api.get<TestRun[]>(`/projects/${projectId}/test-runs`);
  return data;
}

export async function getTestRun(id: number): Promise<TestRun> {
  const { data } = await api.get<TestRun>(`/test-runs/${id}`);
  return data;
}

// Defects
export async function getDefects(runId: number): Promise<Defect[]> {
  const { data } = await api.get<Defect[]>(`/test-runs/${runId}/defects`);
  return data;
}

export async function getDefect(id: number): Promise<Defect> {
  const { data } = await api.get<Defect>(`/defects/${id}`);
  return data;
}

export async function updateDefectStatus(id: number, status: DefectStatus): Promise<Defect> {
  const { data } = await api.patch<Defect>(`/defects/${id}/status`, { status });
  return data;
}

// Risk Scores
export async function getRiskScores(projectId: number): Promise<RiskScore[]> {
  const { data } = await api.get<RiskScore[]>(`/projects/${projectId}/risk-scores`);
  return data;
}

// MCP
export async function getMcpStatus(projectId: number): Promise<McpStatus[]> {
  const { data } = await api.get<McpStatus[]>(`/projects/${projectId}/mcp-status`);
  return data;
}

export async function configureMcp(
  projectId: number,
  payload: { serverType: McpServerType; config: Record<string, string> }
): Promise<void> {
  await api.post(`/projects/${projectId}/mcp-config`, payload);
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

export async function getRiskHeatmap(projectId: number): Promise<RiskScore[]> {
  const { data } = await api.get<RiskScore[]>(`/projects/${projectId}/risk-heatmap`);
  return data;
}

export default api;
