import { useState } from 'react'
import { Shield, ShieldOff, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface GuardrailsInfo {
  passed:          boolean
  rail_triggered?: string | null
  risk_score?:     number
  blocked_reason?: string | null
  safe_message?:   string | null
  input_latency?:  number
  output_latency?: number
  latency_ms?:     number
}

interface Props {
  guardrails: GuardrailsInfo | null
  blocked?:   boolean
}

// ── Rail label map ─────────────────────────────────────────────────────────

const RAIL_LABELS: Record<string, string> = {
  check_jailbreak:            'Jailbreak attempt blocked',
  check_prompt_injection:     'Prompt injection blocked',
  check_pii_request:          'PII request blocked',
  check_off_topic:            'Off-topic query blocked',
  check_length:               'Input too long',
  check_pii_output:           'Output PII filtered',
  check_sensitive_disclosure: 'Sensitive data filtered',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GuardrailsStatusBadge({ guardrails, blocked }: Props) {
  const [open, setOpen] = useState(false)

  if (!guardrails) return null

  const isBlocked  = blocked || !guardrails.passed
  const rail       = guardrails.rail_triggered
  const riskScore  = guardrails.risk_score ?? 0
  const latencyMs  = guardrails.latency_ms
    ?? ((guardrails.input_latency ?? 0) + (guardrails.output_latency ?? 0))

  const riskColor =
    riskScore >= 0.8 ? 'text-red-400' :
    riskScore >= 0.5 ? 'text-yellow-400' :
    'text-emerald-400'

  // Collapsed badge
  if (!isBlocked) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <Shield size={11} className="text-emerald-500 shrink-0" />
        <span className="text-xs text-slate-600">
          Guardrails passed
          {latencyMs > 0 && <span className="ml-1 opacity-60">({latencyMs}ms)</span>}
        </span>
      </div>
    )
  }

  // Blocked — expandable detail
  return (
    <div className="mt-2 border border-red-800/60 bg-red-950/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-900/20 transition-colors"
      >
        {riskScore >= 0.8
          ? <ShieldOff size={13} className="text-red-400 shrink-0" />
          : <ShieldAlert size={13} className="text-orange-400 shrink-0" />}
        <span className="text-xs font-semibold text-red-300 flex-1">
          {rail ? (RAIL_LABELS[rail] ?? rail.replace(/_/g, ' ')) : 'Response blocked by guardrails'}
        </span>
        <span className={`text-xs font-mono ${riskColor} shrink-0`}>
          {(riskScore * 100).toFixed(0)}% risk
        </span>
        {open
          ? <ChevronDown size={11} className="text-slate-500 shrink-0" />
          : <ChevronRight size={11} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-red-800/30 space-y-1.5">
          {guardrails.blocked_reason && (
            <p className="text-xs text-red-400/80">
              <span className="font-medium text-red-400">Reason:</span> {guardrails.blocked_reason}
            </p>
          )}
          {rail && (
            <p className="text-xs text-slate-500">
              <span className="font-medium">Rail:</span>{' '}
              <code className="font-mono text-slate-400">{rail}</code>
            </p>
          )}
          {latencyMs > 0 && (
            <p className="text-xs text-slate-600">Rail check: {latencyMs}ms</p>
          )}
        </div>
      )}
    </div>
  )
}
