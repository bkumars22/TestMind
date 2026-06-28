import { useEffect, useRef, useState } from 'react'

const AI_ENGINE = import.meta.env.VITE_AI_ENGINE_URL ?? 'http://localhost:8001'

// ── Types ──────────────────────────────────────────────────────────────────

interface PipelineNode {
  id: string
  label: string
  parallel: boolean
  branch?: 'A' | 'B'
}

type NodeStatus = 'waiting' | 'running' | 'done' | 'error'

interface NodeState {
  status: NodeStatus
  startedAt?: number
  doneAt?: number
  error?: string
}

interface Props {
  runId: string
  onDone?: (status: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function elapsed(ns: NodeState): string {
  if (!ns.startedAt) return ''
  const end = ns.doneAt ?? Date.now() / 1000
  const ms = Math.round((end - ns.startedAt) * 1000)
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

const STATUS_RING: Record<NodeStatus, string> = {
  waiting: 'border-slate-600 bg-slate-800',
  running: 'border-blue-400 bg-blue-900/40 animate-pulse',
  done:    'border-green-500 bg-green-900/30',
  error:   'border-red-500 bg-red-900/30',
}

const STATUS_DOT: Record<NodeStatus, string> = {
  waiting: 'bg-slate-600',
  running: 'bg-blue-400',
  done:    'bg-green-500',
  error:   'bg-red-500',
}

const STATUS_TEXT: Record<NodeStatus, string> = {
  waiting: 'text-slate-500',
  running: 'text-blue-300',
  done:    'text-green-400',
  error:   'text-red-400',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PipelineProgressLive({ runId, onDone }: Props) {
  const [nodes, setNodes]         = useState<PipelineNode[]>([])
  const [nodeState, setNodeState] = useState<Record<string, NodeState>>({})
  const [connected, setConnected] = useState(false)
  const [pipelineDone, setPipelineDone] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!runId) return
    setConnected(false)
    setPipelineDone(false)
    setNodeState({})

    const es = new EventSource(`${AI_ENGINE}/stream/${runId}`)
    esRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          event: string
          node?: string
          nodes?: PipelineNode[]
          status?: string
          error?: string
          ts?: number
        }

        if (msg.event === 'topology' && msg.nodes) {
          setNodes(msg.nodes)
          const initial: Record<string, NodeState> = {}
          for (const n of msg.nodes) initial[n.id] = { status: 'waiting' }
          setNodeState(initial)
        }

        if (msg.event === 'node_start' && msg.node) {
          setNodeState(prev => ({
            ...prev,
            [msg.node!]: { ...prev[msg.node!], status: 'running', startedAt: msg.ts },
          }))
        }

        if (msg.event === 'node_done' && msg.node) {
          setNodeState(prev => ({
            ...prev,
            [msg.node!]: { ...prev[msg.node!], status: 'done', doneAt: msg.ts },
          }))
        }

        if (msg.event === 'node_error' && msg.node) {
          setNodeState(prev => ({
            ...prev,
            [msg.node!]: { ...prev[msg.node!], status: 'error', error: msg.error, doneAt: msg.ts },
          }))
        }

        if (msg.event === 'done' || msg.event === 'error') {
          setPipelineDone(true)
          setConnected(false)
          es.close()
          onDone?.(msg.status ?? msg.event)
        }
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
    }

    return () => { es.close() }
  }, [runId])

  // Separate parallel nodes from sequential
  const parallelNodes = nodes.filter(n => n.parallel)
  const sequentialNodes = nodes.filter(n => !n.parallel)

  const branchA = parallelNodes.filter(n => n.branch === 'A')
  const branchB = parallelNodes.filter(n => n.branch === 'B')

  // overall progress
  const doneCount = Object.values(nodeState).filter(s => s.status === 'done').length
  const totalCount = nodes.length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : pipelineDone ? 'bg-slate-500' : 'bg-yellow-400'}`} />
          <span className="text-sm font-semibold text-slate-300">
            {connected ? 'Live' : pipelineDone ? 'Complete' : 'Connecting…'}
          </span>
          <span className="text-xs text-slate-500 font-mono">{runId.slice(0, 8)}…</span>
        </div>
        <span className="text-xs text-slate-400">{pct}% · {doneCount}/{totalCount} nodes</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {nodes.length === 0 && (
        <div className="text-slate-500 text-sm text-center animate-pulse py-4">
          Waiting for pipeline topology…
        </div>
      )}

      {/* DAG visualization */}
      {nodes.length > 0 && (
        <div className="space-y-2">
          {/* Sequential nodes before parallel section */}
          {sequentialNodes.slice(0, sequentialNodes.indexOf(sequentialNodes.find(n => n.id === 'merge_risk_gaps')!)).map((n) => (
            <NodeCard key={n.id} node={n} state={nodeState[n.id] ?? { status: 'waiting' }} />
          ))}

          {/* Parallel fork */}
          {parallelNodes.length > 0 && (
            <div className="relative pl-4">
              {/* Fork line */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                <div className="w-px flex-1 bg-slate-600" />
              </div>

              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <span className="w-3 h-px bg-slate-600 inline-block" />
                parallel
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  {branchA.map((n) => (
                    <NodeCard key={n.id} node={n} state={nodeState[n.id] ?? { status: 'waiting' }} compact />
                  ))}
                </div>
                <div className="space-y-1">
                  {branchB.map((n) => (
                    <NodeCard key={n.id} node={n} state={nodeState[n.id] ?? { status: 'waiting' }} compact />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Merge + sequential tail */}
          {sequentialNodes.filter(n =>
            sequentialNodes.indexOf(n) >= sequentialNodes.indexOf(sequentialNodes.find(sn => sn.id === 'merge_risk_gaps') ?? n)
          ).map((n) => (
            <NodeCard key={n.id} node={n} state={nodeState[n.id] ?? { status: 'waiting' }} />
          ))}
        </div>
      )}
    </div>
  )
}


// ── NodeCard ───────────────────────────────────────────────────────────────

function NodeCard({ node, state, compact }: { node: PipelineNode; state: NodeState; compact?: boolean }) {
  const pad = compact ? 'px-3 py-1.5' : 'px-4 py-2'
  return (
    <div className={`border rounded-lg ${pad} flex items-center justify-between ${STATUS_RING[state.status]} transition-all duration-300`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[state.status]}`} />
        <span className={`text-sm font-medium ${STATUS_TEXT[state.status]}`}>{node.label}</span>
        {state.error && (
          <span className="text-xs text-red-400 truncate max-w-xs" title={state.error}>{state.error}</span>
        )}
      </div>
      {state.startedAt && (
        <span className="text-xs text-slate-500 shrink-0 ml-2">{elapsed(state)}</span>
      )}
    </div>
  )
}
