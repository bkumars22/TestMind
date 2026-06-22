import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { pipelineApi } from '../services/pipelineApi';
import type { ExecutionResult } from '../services/pipelineApi';

function statusColor(status: string) {
  switch (status) {
    case 'PASSED': return 'bg-green-100 text-green-700';
    case 'FAILED': return 'bg-red-100 text-red-700';
    case 'ERROR': return 'bg-orange-100 text-orange-700';
    case 'SKIPPED': return 'bg-gray-100 text-gray-500';
    default: return 'bg-blue-100 text-blue-700';
  }
}

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    P0: 'bg-red-600 text-white',
    P1: 'bg-orange-500 text-white',
    P2: 'bg-yellow-400 text-gray-900',
    P3: 'bg-blue-400 text-white',
  };
  return map[severity] ?? 'bg-gray-200 text-gray-700';
}

interface AiExplanation {
  root_cause?: string;
  business_impact?: string;
  fix_recommendation?: string;
  severity?: string;
}

function parseExplanation(raw?: string): AiExplanation | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function ScoreBar({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-gray-400 text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600">{pct}%</span>
    </div>
  );
}

function ResultRow({ result }: { result: ExecutionResult }) {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const explanation = parseExplanation(result.aiExplanation);

  return (
    <>
      <tr
        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
            {result.testCaseTitle}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(result.status)}`}>
            {result.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{result.durationMs != null ? `${result.durationMs}ms` : '—'}</td>
        <td className="px-4 py-3"><ScoreBar score={result.deepevalScore} /></td>
        <td className="px-4 py-3">
          {result.screenshotUrl && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(true); }}
              className="text-xs text-brand-600 underline"
            >
              View
            </button>
          )}
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-6 py-4">
            {result.errorMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span className="font-semibold">Error:</span> {result.errorMessage}
              </div>
            )}
            {explanation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Root Cause</p>
                  <p className="text-gray-800">{explanation.root_cause ?? '—'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Business Impact</p>
                  <p className="text-gray-800">{explanation.business_impact ?? '—'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fix Recommendation</p>
                  <p className="text-gray-800">{explanation.fix_recommendation ?? '—'}</p>
                </div>
                {explanation.severity && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Severity</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${severityBadge(explanation.severity)}`}>
                      {explanation.severity}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No AI explanation available.</p>
            )}
          </td>
        </tr>
      )}

      {lightbox && result.screenshotUrl && (
        <tr>
          <td colSpan={5}>
            <div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
              onClick={() => setLightbox(false)}
            >
              <img src={result.screenshotUrl} alt="screenshot" className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function PipelineExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runId = Number(id);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['pipeline-executions', runId],
    queryFn: () => pipelineApi.getExecutions(runId),
    refetchInterval: 5000,
  });

  const { data: run } = useQuery({
    queryKey: ['pipeline-run', runId],
    queryFn: () => pipelineApi.get(runId),
  });

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgDeepeval = results.length > 0
    ? results.filter(r => r.deepevalScore != null).reduce((s, r) => s + (r.deepevalScore ?? 0), 0) /
      Math.max(results.filter(r => r.deepevalScore != null).length, 1)
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate(`/pipeline/${runId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={16} /> Back to Pipeline
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Execution Results</h1>
          {run && <p className="text-sm text-gray-500 mt-0.5">{run.jiraStoryId} — {run.jiraSummary}</p>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tests', value: total, icon: <Clock size={18} />, color: 'text-blue-600' },
          { label: 'Passed', value: passed, icon: <CheckCircle2 size={18} />, color: 'text-green-600' },
          { label: 'Failed', value: failed, icon: <XCircle size={18} />, color: 'text-red-600' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: <AlertTriangle size={18} />, color: passRate >= 80 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`flex items-center gap-2 ${card.color} mb-1`}>
              {card.icon}
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* deepeval avg */}
      {results.some(r => r.deepevalScore != null) && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Avg deepeval score</span>
          <ScoreBar score={avgDeepeval} />
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading results…</div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No execution results yet.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Test Case', 'Status', 'Duration', 'deepeval', 'Screenshot'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => <ResultRow key={r.id} result={r} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
