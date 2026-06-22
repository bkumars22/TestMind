import axios from 'axios';
import { getToken } from './api';

const base = '/api';

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

export interface PipelineStartPayload {
  projectId: number;
  jiraStoryId: string;
}

export interface PipelineRun {
  id: number;
  projectId: number;
  jiraStoryId: string;
  jiraSummary: string;
  status: string;
  currentStage: number;
  startedAt: string;
  completedAt?: string;
  reportUrl?: string;
  errorMessage?: string;
}

export interface StoryAnalysis {
  id: number;
  jiraStoryId: string;
  jiraSummary: string;
  businessRules: string; // JSON string
  acceptanceCriteria: string;
  edgeCases: string;
  dataRules: string;
  analyzedAt: string;
}

export interface GapReport {
  id: number;
  gapCategory: string;
  description: string;
  priorityScore: number;
  affectedRequirement: string;
}

export interface TestCase {
  id: number;
  pipelineRunId: number;
  title: string;
  testType: string;
  gapCategory: string;
  preconditions: string;
  testSteps: string; // JSON string — array of {step, action, expected}
  expectedResult: string;
  priority: string;
  status: string; // PENDING | APPROVED | REJECTED | EDITED
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface ExecutionResult {
  id: number;
  testCaseId: number;
  testCaseTitle: string;
  status: string;
  durationMs?: number;
  screenshotUrl?: string;
  errorMessage?: string;
  aiExplanation?: string;
  deepevalScore?: number;
}

export const pipelineApi = {
  start: (payload: PipelineStartPayload) =>
    axios
      .post<PipelineRun>(`${base}/pipeline/start`, payload, { headers: authHeaders() })
      .then((r) => r.data),

  list: (projectId: number) =>
    axios
      .get<PipelineRun[]>(`${base}/pipeline?projectId=${projectId}`, { headers: authHeaders() })
      .then((r) => r.data),

  get: (id: number) =>
    axios
      .get<PipelineRun>(`${base}/pipeline/${id}`, { headers: authHeaders() })
      .then((r) => r.data),

  resume: (id: number) =>
    axios
      .post<PipelineRun>(`${base}/pipeline/${id}/resume`, {}, { headers: authHeaders() })
      .then((r) => r.data),

  getStory: (id: number) =>
    axios
      .get<StoryAnalysis>(`${base}/pipeline/${id}/story`, { headers: authHeaders() })
      .then((r) => r.data),

  getGaps: (id: number) =>
    axios
      .get<GapReport[]>(`${base}/pipeline/${id}/gaps`, { headers: authHeaders() })
      .then((r) => r.data),

  getTestCases: (pipelineRunId: number) =>
    axios
      .get<TestCase[]>(`${base}/test-cases?pipelineRunId=${pipelineRunId}`, {
        headers: authHeaders(),
      })
      .then((r) => r.data),

  reviewTestCase: (
    id: number,
    payload: {
      status: string;
      reviewerNotes?: string;
      updatedTitle?: string;
      updatedExpectedResult?: string;
    }
  ) =>
    axios
      .patch<TestCase>(`${base}/test-cases/${id}/review`, payload, { headers: authHeaders() })
      .then((r) => r.data),

  approveAll: (pipelineRunId: number) =>
    axios
      .post(
        `${base}/test-cases/approve-all?pipelineRunId=${pipelineRunId}`,
        {},
        { headers: authHeaders() }
      )
      .then((r) => r.data),

  getExecutions: (id: number) =>
    axios
      .get<ExecutionResult[]>(`${base}/pipeline/${id}/executions`, { headers: authHeaders() })
      .then((r) => r.data),

  getGeneratedCode: (id: number) =>
    axios
      .get<GeneratedFile[]>(`${base}/pipeline/${id}/code`, { headers: authHeaders() })
      .then((r) => r.data),
};

export interface GeneratedFile {
  id: number;
  framework: string; // PLAYWRIGHT | SELENIUM
  filename: string;
  content: string;
  language: string;
}
