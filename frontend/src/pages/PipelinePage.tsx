import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Loader2, Workflow } from 'lucide-react';
import { pipelineApi } from '../services/pipelineApi';
import type { PipelineRun } from '../services/pipelineApi';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function isRunning(status: string): boolean {
  return status.startsWith('STAGE_');
}

interface PipelineStatusBadgeProps {
  status: string;
}

function PipelineStatusBadge({ status }: PipelineStatusBadgeProps) {
  if (status === 'AWAITING_APPROVAL') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Awaiting Review
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Completed
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Failed
      </span>
    );
  }
  if (isRunning(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
        </span>
        Running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}

function StageBadge({ stage }: { stage: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
      {stage}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export function PipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // For listing, default projectId = 0 means all (server can handle)
  const [filterProjectId, setFilterProjectId] = useState<number>(1);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState('');
  const [formJiraStoryId, setFormJiraStoryId] = useState('');

  const { data: runs = [], isLoading } = useQuery<PipelineRun[]>({
    queryKey: ['pipeline-runs', filterProjectId],
    queryFn: () => pipelineApi.list(filterProjectId),
    refetchInterval: runs.some((r) => isRunning(r.status)) ? 5_000 : false,
  });

  const startMutation = useMutation({
    mutationFn: pipelineApi.start,
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs'] });
      navigate(`/pipeline/${run.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pid = parseInt(formProjectId, 10);
    if (!pid || !formJiraStoryId.trim()) return;
    startMutation.mutate({ projectId: pid, jiraStoryId: formJiraStoryId.trim() });
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Workflow size={22} className="text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">QA Pipeline</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Autonomous 7-stage QA from Jira story to CI/CD
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          Start New Pipeline
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Pipeline Run</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Project ID</label>
              <input
                type="number"
                min={1}
                required
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Jira Story ID</label>
              <input
                type="text"
                required
                value={formJiraStoryId}
                onChange={(e) => setFormJiraStoryId(e.target.value)}
                placeholder="e.g. PROJ-123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={startMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {startMutation.isPending && <Loader2 size={15} className="animate-spin" />}
              Start Pipeline
            </button>
          </form>
          {startMutation.isError && (
            <p className="text-sm text-red-600 mt-3">
              Failed to start pipeline. Please check your inputs and try again.
            </p>
          )}
        </div>
      )}

      {/* Project filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by Project ID:</label>
        <input
          type="number"
          min={1}
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(parseInt(e.target.value, 10) || 1)}
          className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-600" />
          </div>
        ) : runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No pipeline runs found for project {filterProjectId}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Story ID</th>
                  <th className="px-6 py-3 text-left">Summary</th>
                  <th className="px-6 py-3 text-left">Stage</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Started</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-gray-700">#{run.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{run.jiraStoryId}</td>
                    <td className="px-6 py-3 text-gray-600 max-w-xs truncate" title={run.jiraSummary}>
                      {run.jiraSummary || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <StageBadge stage={run.currentStage} />
                    </td>
                    <td className="px-6 py-3">
                      <PipelineStatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => navigate(`/pipeline/${run.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
