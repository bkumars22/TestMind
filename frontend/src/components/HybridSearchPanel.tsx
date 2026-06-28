import { useState } from 'react'
import { Search, Loader2, ChevronDown, ChevronRight, Layers } from 'lucide-react'

const AI_ENGINE = import.meta.env.VITE_AI_ENGINE_URL ?? 'http://localhost:8001'

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  content:     string
  metadata:    Record<string, unknown>
  source_type: string
  dense_score: number
  bm25_score:  number
  rrf_score:   number
  found_by:    'both' | 'dense' | 'bm25'
}

interface SearchResponse {
  query:   string
  mode:    string
  count:   number
  results: SearchResult[]
  stats: {
    found_by_both: number
    dense_only:    number
    bm25_only:     number
  }
}

interface Props {
  projectId: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

const FOUND_BY_STYLE: Record<string, string> = {
  both:  'bg-emerald-900/40 border-emerald-700 text-emerald-300',
  dense: 'bg-blue-900/40 border-blue-700 text-blue-300',
  bm25:  'bg-orange-900/40 border-orange-700 text-orange-300',
}

const FOUND_BY_LABEL: Record<string, string> = {
  both:  'Dense + BM25',
  dense: 'Dense only',
  bm25:  'BM25 only',
}

const SOURCE_TYPE_COLOR: Record<string, string> = {
  test_case:  'bg-blue-800/60 text-blue-200',
  defect:     'bg-red-800/60 text-red-200',
  jira_story: 'bg-purple-800/60 text-purple-200',
  run_result: 'bg-green-800/60 text-green-200',
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-10 text-right">{value.toFixed(3)}</span>
    </div>
  )
}

function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const [open, setOpen] = useState(false)
  const preview = result.content.slice(0, 180)
  const typeStyle = SOURCE_TYPE_COLOR[result.source_type] ?? 'bg-slate-700 text-slate-300'
  const foundStyle = FOUND_BY_STYLE[result.found_by] ?? FOUND_BY_STYLE.dense

  return (
    <div className={`border rounded-xl overflow-hidden ${foundStyle}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
      >
        {/* Rank */}
        <span className="text-xs font-bold text-slate-500 shrink-0 mt-0.5 w-5">#{rank}</span>

        {/* Content preview */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{preview}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyle}`}>
            {result.source_type.replace('_', ' ')}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border opacity-80 text-current border-current/40">
            {FOUND_BY_LABEL[result.found_by]}
          </span>
        </div>

        {open
          ? <ChevronDown size={14} className="text-slate-500 shrink-0 mt-0.5" />
          : <ChevronRight size={14} className="text-slate-500 shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-current/20 pt-3 space-y-3">
          {/* Score bars */}
          <div className="space-y-1.5">
            <ScoreBar label="RRF"   value={result.rrf_score}   color="bg-emerald-400" />
            <ScoreBar label="Dense" value={result.dense_score} color="bg-blue-400" />
            <ScoreBar label="BM25"  value={result.bm25_score}  color="bg-orange-400" />
          </div>

          {/* Full content */}
          <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            {result.content}
          </pre>

          {/* Metadata */}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.metadata)
                .filter(([k]) => ['file_path', 'story_key', 'severity', 'run_id'].includes(k))
                .map(([k, v]) => (
                  <span key={k} className="text-xs text-slate-500">
                    <span className="text-slate-600">{k}:</span> {String(v)}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function HybridSearchPanel({ projectId }: Props) {
  const [query, setQuery]           = useState('')
  const [sourceType, setSourceType] = useState('')
  const [hybridMode, setHybridMode] = useState(true)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<SearchResponse | null>(null)
  const [error, setError]           = useState('')

  async function search() {
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${AI_ENGINE}/rag/hybrid-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:       query.trim(),
          project_id:  projectId,
          top_k:       10,
          source_type: sourceType || null,
          hybrid:      hybridMode,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') search()
  }

  const bothCount  = result?.stats.found_by_both ?? 0
  const denseCount = result?.stats.dense_only ?? 0
  const bm25Count  = result?.stats.bm25_only ?? 0

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers size={15} className="text-emerald-400" />
          Hybrid Search
          <span className="text-xs font-normal text-slate-500">BM25 + Dense · Reciprocal Rank Fusion</span>
        </h3>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-b border-slate-700 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search test cases, defects, Jira stories…"
            className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-4 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="">All sources</option>
            <option value="test_case">Test cases</option>
            <option value="defect">Defects</option>
            <option value="jira_story">Jira stories</option>
            <option value="run_result">Run results</option>
          </select>

          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHybridMode(true)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${hybridMode ? 'bg-emerald-700 border-emerald-600 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
            >
              Hybrid (BM25 + Dense)
            </button>
            <button
              onClick={() => setHybridMode(false)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!hybridMode ? 'bg-blue-700 border-blue-600 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
            >
              Dense only
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-5 py-4 space-y-3">
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {result && (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs pb-1">
              <span className="text-slate-400">{result.count} results · <span className="font-mono text-slate-300">{result.mode}</span></span>
              {result.mode === 'hybrid_rrf' && (
                <div className="flex gap-3 ml-auto">
                  {bothCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      {bothCount} both
                    </span>
                  )}
                  {denseCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                      {denseCount} dense
                    </span>
                  )}
                  {bm25Count > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                      {bm25Count} BM25
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-xs text-slate-500 pb-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-800/80 border border-emerald-700" /> Dense + BM25
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-800/80 border border-blue-700" /> Dense only
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-orange-800/80 border border-orange-700" /> BM25 only
              </span>
            </div>

            {result.results.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No documents found. Try a broader query or ingest some documents first.</p>
            ) : (
              <div className="space-y-2">
                {result.results.map((r, i) => (
                  <ResultCard key={i} result={r} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        )}

        {!result && !loading && !error && (
          <p className="text-slate-600 text-sm text-center py-8">
            Enter a query to search the knowledge base with hybrid BM25 + semantic retrieval.
          </p>
        )}
      </div>
    </div>
  )
}
