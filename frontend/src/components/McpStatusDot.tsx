import { useState } from 'react';
import type { McpServerType } from '../types';

interface McpStatusDotProps {
  type: McpServerType;
  isActive: boolean;
}

const SERVER_LABELS: Record<McpServerType, string> = {
  PLAYWRIGHT: 'Playwright',
  GITHUB: 'GitHub',
  FILESYSTEM: 'Filesystem',
  JIRA: 'Jira',
  SLACK: 'Slack',
};

export function McpStatusDot({ type, isActive }: McpStatusDotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const label = SERVER_LABELS[type];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`${label}: ${isActive ? 'active' : 'inactive'}`}
      >
        <span
          className={`block h-3 w-3 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap">
          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg">
            {label}: {isActive ? 'Active' : 'Inactive'}
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
