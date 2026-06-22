import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Pencil,
  Loader2,
  PlayCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { pipelineApi } from '../services/pipelineApi';
import type { TestCase, GapReport, StoryAnalysis } from '../services/pipelineApi';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface AcceptanceCriterion {
  given?: string;
  when?: string;
  then?: string;
}

interface TestStep {
  step?: number | string;
  action?: string;
  expected?: string;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isRunning(status: string) {
  return status.startsWith('STAGE_');
}

// ────────────────────────────────────────────────────────────
// Stage Tracker
// ────────────────────────────────────────────────────────────

const STAGES = [
  'Story Ingestion',
  'Gap Analysis',
  'Test Generation',
  'Review',
  'Execution',
  'Analysis',
  'CI/CD',
];

interface StageTrackerProps {
  currentStage: number;
  status: string;
}

function StageTracker({ currentStage, status }: StageTrackerProps) {
  const isFailed = status === 'FAILED';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 overflow-x-auto">
      <div className="flex items-center min-w-max mx-auto">
        {STAGES.map((label, idx) => {
          const stageNum = idx + 1;
          const isCompleted = stageNum < currentStage || status === 'COMPLETED';
          const isActive = stageNum === currentStage && !isFailed;
          const isBroken = stageNum === currentStage && isFailed;

          return (
            <div key={stageNum} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-bold transition-colors
                    ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                    ${isActive ? 'border-blue-500 bg-blue-500 text-white' : ''}
                    ${isBroken ? 'border-red-500 bg-red-500 text-white' : ''}
                    ${!isCompleted && !isActive && !isBroken ? 'border-gray-300 bg-white text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} />
                  ) : isBroken ? (
                    <XCircle size={18} />
                  ) : (
                    stageNum
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap max-w-[80px] text-center leading-tight
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isActive ? 'text-blue-600' : ''}
                    ${isBroken ? 'text-red-600' : ''}
                    ${!isCompleted && !isActive && !isBroken ? 'text-gray-400' : ''}
                  `}
                >
                  {label}
                </span>
              </div>

              {/* Connector */}
              {idx < STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-10 md:w-14 mx-1 mb-4 rounded ${
                    stageNum < currentStage ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Status badge (pipeline-specific)
// ────────────────────────────────────────────────────────────

function PipelineStatusBadge({ status }: { status: string }) {
  if (status === 'AWAITING_APPROVAL')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock size={11} /> Awaiting Review
      </span>
    );
  if (status === 'COMPLETED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 size={11} /> Completed
      </span>
    );
  if (status === 'FAILED')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={11} /> Failed
      </span>
    );
  if (isRunning(status))
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
        </span>
        Running
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Story Analysis
// ────────────────────────────────────────────────────────────

function StoryTab({ story }: { story: StoryAnalysis }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const businessRules: string[] = safeParseJson(story.businessRules, []);
  const acceptanceCriteria: AcceptanceCriterion[] = safeParseJson(story.acceptanceCriteria, []);
  const edgeCases: string[] = safeParseJson(story.edgeCases, []);
  const dataRules: string[] = safeParseJson(story.dataRules, []);

  const sections: { key: string; title: string; content: React.ReactNode }[] = [
    {
      key: 'business',
      title: 'Business Rules',
      content:
        businessRules.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {businessRules.map((rule, i) => (
              <li key={i} className="text-sm text-gray-700">
                {rule}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No data.</p>
        ),
    },
    {
      key: 'acceptance',
      title: 'Acceptance Criteria',
      content:
        acceptanceCriteria.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                    Given
                  </th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                    When
                  </th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                    Then
                  </th>
                </tr>
              </thead>
              <tbody>
                {acceptanceCriteria.map((ac, i) => (
                  <tr key={i} className="even:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 text-gray-700">
                      {ac.given ?? '—'}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-gray-700">
                      {ac.when ?? '—'}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-gray-700">
                      {ac.then ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No data.</p>
        ),
    },
    {
      key: 'edge',
      title: 'Edge Cases',
      content:
        edgeCases.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {edgeCases.map((ec, i) => (
              <li key={i} className="text-sm text-gray-700">
                {ec}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No data.</p>
        ),
    },
    {
      key: 'data',
      title: 'Data Rules',
      content:
        dataRules.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {dataRules.map((dr, i) => (
              <li key={i} className="text-sm text-gray-700">
                {dr}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No data.</p>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-blue-900">{story.jiraSummary}</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Story: {story.jiraStoryId} · Analysed: {new Date(story.analyzedAt).toLocaleString()}
        </p>
      </div>

      {sections.map((sec) => (
        <div key={sec.key} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(sec.key)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-900"
          >
            {sec.title}
            {open[sec.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {open[sec.key] && <div className="px-4 py-4">{sec.content}</div>}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Gap Analysis
// ────────────────────────────────────────────────────────────

const GAP_COLOURS: Record<string, string> = {
  BUSINESS: 'bg-purple-100 text-purple-700',
  FUNCTIONAL: 'bg-blue-100 text-blue-700',
  TECHNICAL: 'bg-orange-100 text-orange-700',
  DATA: 'bg-yellow-100 text-yellow-700',
  SECURITY: 'bg-red-100 text-red-700',
};

function GapTab({ gaps }: { gaps: GapReport[] }) {
  if (gaps.length === 0)
    return <p className="text-sm text-gray-400">No gaps identified.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-left w-40">Priority</th>
            <th className="px-4 py-3 text-left">Affected Requirement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {gaps.map((gap) => (
            <tr key={gap.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    GAP_COLOURS[gap.gapCategory] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {gap.gapCategory}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700 max-w-xs">{gap.description}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full"
                      style={{ width: `${Math.round(gap.priorityScore * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-600 w-8">
                    {Math.round(gap.priorityScore * 100)}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                {gap.affectedRequirement}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Test Case Card
// ────────────────────────────────────────────────────────────

const TEST_TYPE_COLOURS: Record<string, string> = {
  HAPPY_PATH: 'bg-green-100 text-green-700',
  ERROR_PATH: 'bg-red-100 text-red-700',
  EDGE_CASE: 'bg-orange-100 text-orange-700',
};

const PRIORITY_COLOURS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-blue-100 text-blue-700',
};

const TC_STATUS_COLOURS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EDITED: 'bg-blue-100 text-blue-700',
};

interface TestCaseCardProps {
  tc: TestCase;
  onReview: (
    id: number,
    payload: {
      status: string;
      reviewerNotes?: string;
      updatedTitle?: string;
      updatedExpectedResult?: string;
    }
  ) => void;
  isPending: boolean;
}

function TestCaseCard({ tc, onReview, isPending }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(tc.title);
  const [editExpected, setEditExpected] = useState(tc.expectedResult);
  const [notes, setNotes] = useState('');

  const steps: TestStep[] = safeParseJson(tc.testSteps, []);
  const isRejected = tc.status === 'REJECTED';

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-colors ${
        isRejected
          ? 'border-red-200 bg-red-50'
          : tc.status === 'APPROVED'
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-4 py-3 cursor-pointer"
        onClick={() => !editMode && setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                TEST_TYPE_COLOURS[tc.testType] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {tc.testType.replace('_', ' ')}
            </span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                GAP_COLOURS[tc.gapCategory] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {tc.gapCategory}
            </span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                PRIORITY_COLOURS[tc.priority] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {tc.priority}
            </span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                TC_STATUS_COLOURS[tc.status] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {tc.status}
            </span>
          </div>
          <p
            className={`text-sm font-medium text-gray-900 ${isRejected ? 'line-through text-gray-500' : ''}`}
          >
            {tc.title}
          </p>
        </div>
        <div className="ml-3 flex-shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          {editMode ? (
            /* Edit mode */
            <div className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expected Result
                </label>
                <textarea
                  rows={3}
                  value={editExpected}
                  onChange={(e) => setEditExpected(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={isPending}
                  onClick={() => {
                    onReview(tc.id, {
                      status: 'EDITED',
                      updatedTitle: editTitle,
                      updatedExpectedResult: editExpected,
                    });
                    setEditMode(false);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-4 pt-3">
              {tc.preconditions && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Preconditions
                  </p>
                  <p className="text-sm text-gray-700">{tc.preconditions}</p>
                </div>
              )}

              {steps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Test Steps
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-medium text-gray-500">
                          <th className="border border-gray-200 px-3 py-2 text-left w-12">#</th>
                          <th className="border border-gray-200 px-3 py-2 text-left">Action</th>
                          <th className="border border-gray-200 px-3 py-2 text-left">Expected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steps.map((s, i) => (
                          <tr key={i} className="even:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2 text-gray-500 font-mono">
                              {s.step ?? i + 1}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-700">
                              {s.action ?? '—'}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-700">
                              {s.expected ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Expected Result
                </p>
                <p className="text-sm text-gray-700">{tc.expectedResult}</p>
              </div>

              {tc.reviewerNotes && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Reviewer Notes
                  </p>
                  <p className="text-sm text-gray-700">{tc.reviewerNotes}</p>
                </div>
              )}

              {/* Action buttons — only shown for PENDING */}
              {tc.status === 'PENDING' && (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional reviewer notes..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() =>
                        onReview(tc.id, { status: 'APPROVED', reviewerNotes: notes })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Approve
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => setEditMode(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() =>
                        onReview(tc.id, { status: 'REJECTED', reviewerNotes: notes })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
                    >
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tab: Test Cases Review
// ────────────────────────────────────────────────────────────

interface TestCasesTabProps {
  pipelineRunId: number;
  pipelineStatus: string;
  onResume: () => void;
  isResuming: boolean;
}

function TestCasesTab({
  pipelineRunId,
  pipelineStatus,
  onResume,
  isResuming,
}: TestCasesTabProps) {
  const queryClient = useQueryClient();

  const { data: testCases = [], isLoading } = useQuery<TestCase[]>({
    queryKey: ['test-cases', pipelineRunId],
    queryFn: () => pipelineApi.getTestCases(pipelineRunId),
    refetchInterval: isRunning(pipelineStatus) ? 3_000 : false,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        status: string;
        reviewerNotes?: string;
        updatedTitle?: string;
        updatedExpectedResult?: string;
      };
    }) => pipelineApi.reviewTestCase(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', pipelineRunId] });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: () => pipelineApi.approveAll(pipelineRunId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', pipelineRunId] });
    },
  });

  const total = testCases.length;
  const approved = testCases.filter((t) => t.status === 'APPROVED' || t.status === 'EDITED').length;
  const pending = testCases.filter((t) => t.status === 'PENDING').length;
  const rejected = testCases.filter((t) => t.status === 'REJECTED').length;

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Summary bar + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <span className="text-sm font-medium text-gray-700">
            Total: <span className="font-bold">{total}</span>
          </span>
          <span className="text-sm font-medium text-green-700">
            Approved: <span className="font-bold">{approved}</span>
          </span>
          <span className="text-sm font-medium text-gray-500">
            Pending: <span className="font-bold">{pending}</span>
          </span>
          <span className="text-sm font-medium text-red-700">
            Rejected: <span className="font-bold">{rejected}</span>
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {pending > 0 && (
            <button
              disabled={approveAllMutation.isPending}
              onClick={() => approveAllMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {approveAllMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              <Check size={14} />
              Approve All
            </button>
          )}
          {pending === 0 && pipelineStatus === 'AWAITING_APPROVAL' && (
            <button
              disabled={isResuming}
              onClick={onResume}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {isResuming ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <PlayCircle size={14} />
              )}
              Resume Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      {testCases.length === 0 ? (
        <p className="text-sm text-gray-400">No test cases yet.</p>
      ) : (
        <div className="space-y-3">
          {testCases.map((tc) => (
            <TestCaseCard
              key={tc.id}
              tc={tc}
              isPending={reviewMutation.isPending}
              onReview={(id, payload) => reviewMutation.mutate({ id, payload })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────

const TABS = ['Story Analysis', 'Gap Analysis', 'Test Cases Review', 'Execution Results', 'Generated Code'];

export function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericId = parseInt(id ?? '0', 10);

  const [activeTab, setActiveTab] = useState(0);

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ['pipeline-run', numericId],
    queryFn: () => pipelineApi.get(numericId),
    refetchInterval: (query) =>
      query.state.data && isRunning(query.state.data.status) ? 3_000 : false,
  });

  const { data: story } = useQuery({
    queryKey: ['pipeline-story', numericId],
    queryFn: () => pipelineApi.getStory(numericId),
    enabled: !!run && run.currentStage >= 1,
  });

  const { data: gaps = [] } = useQuery<GapReport[]>({
    queryKey: ['pipeline-gaps', numericId],
    queryFn: () => pipelineApi.getGaps(numericId),
    enabled: !!run && run.currentStage >= 2,
  });

  const resumeMutation = useMutation({
    mutationFn: () => pipelineApi.resume(numericId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-run', numericId] });
    },
  });

  if (runLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8 text-center text-gray-500">Pipeline run not found.</div>
    );
  }

  const showStory = run.currentStage >= 1;
  const showGaps = run.currentStage >= 2;
  const showTestCases = run.currentStage >= 3 || run.status === 'AWAITING_APPROVAL';
  const showExecutions = run.currentStage >= 5;
  const showCode = run.currentStage >= 6;

  const visibleTabs = TABS.filter((t, i) => {
    if (i === 0) return showStory;
    if (i === 1) return showGaps;
    if (i === 2) return showTestCases;
    if (i === 3) return showExecutions;
    if (i === 4) return showCode;
    return false;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/pipeline')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Pipelines
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Pipeline #{run.id} — {run.jiraStoryId}
          </h1>
          {run.jiraSummary && (
            <p className="text-sm text-gray-500 mt-0.5">{run.jiraSummary}</p>
          )}
        </div>
        <PipelineStatusBadge status={run.status} />
      </div>

      {/* AWAITING_APPROVAL banner */}
      {run.status === 'AWAITING_APPROVAL' && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
          <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Awaiting Your Review</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Test cases have been generated and require QA approval before the pipeline can
              proceed to execution.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {run.status === 'FAILED' && run.errorMessage && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <XCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{run.errorMessage}</p>
        </div>
      )}

      {/* Stage tracker */}
      <StageTracker currentStage={run.currentStage} status={run.status} />

      {/* Tabs */}
      {visibleTabs.length > 0 && (
        <div>
          <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <nav className="flex gap-1 min-w-max">
              {visibleTabs.map((tab) => {
                const originalIdx = TABS.indexOf(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(originalIdx)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === originalIdx
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 0 && story && <StoryTab story={story} />}
            {activeTab === 1 && <GapTab gaps={gaps} />}
            {activeTab === 2 && showTestCases && (
              <TestCasesTab
                pipelineRunId={numericId}
                pipelineStatus={run.status}
                onResume={() => resumeMutation.mutate()}
                isResuming={resumeMutation.isPending}
              />
            )}
            {activeTab === 3 && showExecutions && (
              <div className="text-center py-8 text-sm text-gray-400">
                <button
                  onClick={() => navigate(`/pipeline/${numericId}/executions`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
                >
                  <PlayCircle size={15} />
                  View Execution Results
                </button>
              </div>
            )}
            {activeTab === 4 && showCode && (
              <div className="text-center py-8 text-sm text-gray-400">
                <button
                  onClick={() => navigate(`/pipeline/${numericId}/code`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900"
                >
                  View Generated Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
