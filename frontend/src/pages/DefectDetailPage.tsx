import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getDefect, updateDefectStatus } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import type { DefectStatus } from '../types';

function ConsistencyGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.85 ? 'bg-green-500' : score > 0.6 ? 'bg-yellow-400' : 'bg-red-500';
  const label = score > 0.85 ? 'High confidence' : score > 0.6 ? 'Moderate confidence' : 'Low confidence';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">Consistency Score</span>
        <span className="text-sm font-bold text-gray-900">{score.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs mt-1 font-medium ${
        score > 0.85 ? 'text-green-600' : score > 0.6 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {label} ({pct}%)
      </p>
    </div>
  );
}

const DEFECT_STATUSES: DefectStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'];

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  WONT_FIX: "Won't Fix",
};

export function DefectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const defectId = Number(id);
  const queryClient = useQueryClient();

  const { data: defect, isLoading, isError } = useQuery({
    queryKey: ['defect', defectId],
    queryFn: () => getDefect(defectId),
    enabled: !!defectId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: DefectStatus) => updateDefectStatus(defectId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['defect', defectId], updated);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !defect) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load defect. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          to={`/test-runs/${defect.testRunId}`}
          className="text-gray-400 hover:text-gray-600 mt-1 transition-colors"
          aria-label="Back to test run"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <SeverityBadge severity={defect.severity} />
            <h1 className="text-xl font-bold text-gray-900">{defect.title}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Defect #{defect.id} · Run #{defect.testRunId} · {new Date(defect.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Description</h2>
            <p className="text-gray-800 text-sm leading-relaxed">{defect.description}</p>
          </div>

          {/* AI Explanation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                AI
              </span>
              <h2 className="text-sm font-semibold text-gray-700">AI Explanation</h2>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {defect.aiExplanation}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status control */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
            <select
              value={defect.status}
              onChange={(e) => statusMutation.mutate(e.target.value as DefectStatus)}
              disabled={statusMutation.isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white disabled:opacity-60"
            >
              {DEFECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {statusMutation.isSuccess && (
              <p className="text-xs text-green-600 mt-1.5">Status updated</p>
            )}
          </div>

          {/* Consistency Score */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ConsistencyGauge score={defect.consistencyScore} />
          </div>

          {/* Jira ticket */}
          {defect.jiraTicketId && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Jira Ticket</h3>
              <a
                href={`https://jira.example.com/browse/${defect.jiraTicketId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <ExternalLink size={14} />
                {defect.jiraTicketId}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
