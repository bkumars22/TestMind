import type { DefectSeverity } from '../types';

interface SeverityBadgeProps {
  severity: DefectSeverity;
}

const SEVERITY_CONFIG: Record<DefectSeverity, { label: string; className: string }> = {
  P0: { label: 'P0 CRITICAL', className: 'bg-red-600 text-white' },
  P1: { label: 'P1 HIGH', className: 'bg-orange-500 text-white' },
  P2: { label: 'P2 MEDIUM', className: 'bg-yellow-400 text-gray-900' },
  P3: { label: 'P3 LOW', className: 'bg-blue-500 text-white' },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { label, className } = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
