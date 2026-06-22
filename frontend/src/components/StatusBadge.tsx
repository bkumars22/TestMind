import type { TestRunStatus, DefectStatus } from '../types';

type AnyStatus = TestRunStatus | DefectStatus;

interface StatusBadgeProps {
  status: AnyStatus;
}

const STATUS_CONFIG: Record<AnyStatus, { label: string; className: string; pulse?: boolean }> = {
  // TestRunStatus
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  RUNNING: { label: 'Running', className: 'bg-blue-100 text-blue-700', pulse: true },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  // DefectStatus
  OPEN: { label: 'Open', className: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700', pulse: true },
  RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
  WONT_FIX: { label: "Won't Fix", className: 'bg-gray-100 text-gray-500' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  const { label, className, pulse } = config;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
