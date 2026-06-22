import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import { getTestRun } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import type { TestRunStatus } from '../types';

interface PipelineStep {
  id: number;
  label: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 1, label: 'Fetch' },
  { id: 2, label: 'Risk' },
  { id: 3, label: 'Gaps' },
  { id: 4, label: 'Generate' },
  { id: 5, label: 'Detect' },
  { id: 6, label: 'Explain' },
  { id: 7, label: 'Dispatch' },
];

type StepState = 'pending' | 'active' | 'done' | 'failed';

function getStepState(
  stepId: number,
  currentStep: number,
  runStatus: TestRunStatus
): StepState {
  if (runStatus === 'FAILED' && stepId === currentStep) return 'failed';
  if (stepId < currentStep) return 'done';
  if (stepId === currentStep && runStatus === 'RUNNING') return 'active';
  return 'pending';
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle size={20} className="text-green-500" />;
  if (state === 'failed') return <XCircle size={20} className="text-red-500" />;
  if (state === 'active') {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="animate-ping absolute h-4 w-4 rounded-full bg-brand-400 opacity-75" />
        <span className="relative h-4 w-4 rounded-full bg-brand-600" />
      </span>
    );
  }
  return <Clock size={20} className="text-gray-300" />;
}

// Example generated test — replaced in real usage by websocket data
const SAMPLE_GENERATED_TEST = `import { test, expect } from '@playwright/test';

test('should validate user login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'secret');
  await page.click('[data-testid="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});`;

function CodeBlock({ code }: { code: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      Prism.highlightElement(ref.current);
    }
  }, [code]);

  return (
    <pre className="rounded-lg bg-[#1e1e2e] text-sm overflow-x-auto p-4 border border-gray-700">
      <code ref={ref} className="language-typescript">
        {code}
      </code>
    </pre>
  );
}

export function TestRunPage() {
  const { id } = useParams<{ id: string }>();
  const runId = Number(id);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ['test-run', runId],
    queryFn: () => getTestRun(runId),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'PENDING' ? 5_000 : false;
    },
  });

  const { progress, defects, isConnected, error: wsError, logs } = useWebSocket(
    run?.status === 'RUNNING' ? runId : null
  );

  const currentStep = progress?.step ?? 0;
  const runStatus = run?.status ?? 'PENDING';

  // Auto-scroll log panel
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8">
        <p className="text-red-600">Test run not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/projects/${run.projectId}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to project"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Test Run #{run.id}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Triggered by {run.triggeredBy} · {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        {isConnected && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {wsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          {wsError}
        </div>
      )}

      {/* Pipeline tracker */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">
          Pipeline Progress
        </h2>
        <div className="flex items-center gap-0">
          {PIPELINE_STEPS.map((step, idx) => {
            const state = getStepState(step.id, currentStep, runStatus as TestRunStatus);
            const isLast = idx === PIPELINE_STEPS.length - 1;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <StepIcon state={state} />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      state === 'active'
                        ? 'text-brand-600'
                        : state === 'done'
                        ? 'text-green-600'
                        : state === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      getStepState(step.id + 1, currentStep, runStatus as TestRunStatus) !== 'pending' ||
                      state === 'done'
                        ? 'bg-green-400'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {progress?.stepName && (
          <p className="mt-4 text-sm text-gray-500">
            Current step: <span className="font-medium text-gray-700">{progress.stepName}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live log panel */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Live Logs</h2>
            <span className="text-xs text-gray-400">{logs.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-950 rounded-b-xl" style={{ maxHeight: '320px' }}>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-xs font-mono">
                {run.status === 'RUNNING' ? 'Waiting for logs…' : 'No logs available'}
              </p>
            ) : (
              <div className="space-y-0.5 font-mono text-xs text-green-400">
                {logs.map((log, i) => (
                  <p key={i}>{`> ${log}`}</p>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Defect discovery feed */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Defect Discovery</h2>
            <span className="text-xs text-gray-400">{defects.length} found</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: '320px' }}>
            {defects.length === 0 ? (
              <div className="p-4 text-xs text-gray-400">
                {run.status === 'RUNNING' ? 'Scanning for defects…' : 'No defects detected'}
              </div>
            ) : (
              defects.map((defect, i) => (
                <div key={defect.id ?? i} className="flex items-start gap-3 px-5 py-3">
                  <SeverityBadge severity={defect.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{defect.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{defect.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Generated tests */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Generated Tests
        </h2>
        <CodeBlock code={SAMPLE_GENERATED_TEST} />
      </div>
    </div>
  );
}
