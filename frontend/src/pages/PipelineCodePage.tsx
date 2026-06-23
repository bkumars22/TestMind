import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Check, Code2 } from 'lucide-react';
import { pipelineApi } from '../services/pipelineApi';

interface CodeFile {
  id: number;
  testCaseId?: number;
  framework: string;
  language: string;
  filename: string;
  content: string;
  // legacy aliases kept for template refs below
  fileName?: string;
  filePath?: string;
  codeContent?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeCard({ file }: { file: CodeFile }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <Code2 size={16} className="text-gray-400" />
          <span className="text-sm font-mono font-medium text-gray-800">{file.filename ?? file.fileName}</span>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{file.language}</span>
        </div>
        <CopyButton text={file.content ?? file.codeContent ?? ''} />
      </div>
      {open && (
        <pre className="text-xs bg-[#1e1e2e] text-[#cdd6f4] p-4 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
          <code>{file.content ?? file.codeContent}</code>
        </pre>
      )}
    </div>
  );
}

export function PipelineCodePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runId = Number(id);
  const [activeTab, setActiveTab] = useState<'PLAYWRIGHT' | 'SELENIUM'>('PLAYWRIGHT');

  const { data: allCode = [], isLoading } = useQuery({
    queryKey: ['pipeline-code', runId],
    queryFn: () => pipelineApi.getGeneratedCode(runId) as unknown as Promise<CodeFile[]>,
  });

  const { data: run } = useQuery({
    queryKey: ['pipeline-run', runId],
    queryFn: () => pipelineApi.get(runId),
  });

  const playwright = allCode.filter(f => f.framework === 'PLAYWRIGHT');
  const selenium = allCode.filter(f => f.framework === 'SELENIUM');
  const active = activeTab === 'PLAYWRIGHT' ? playwright : selenium;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(`/pipeline/${runId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={16} /> Back to Pipeline
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Generated Automation Code</h1>
        {run && <p className="text-sm text-gray-500 mt-0.5">{run.jiraStoryId} — {run.jiraSummary}</p>}
      </div>

      {/* Framework tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {(['PLAYWRIGHT', 'SELENIUM'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'PLAYWRIGHT' ? '🎭 Playwright (TypeScript)' : '☕ Selenium (Java)'}
            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {tab === 'PLAYWRIGHT' ? playwright.length : selenium.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading generated code…</div>
      ) : active.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <Code2 size={32} className="mx-auto mb-3 opacity-30" />
          <p>No {activeTab.toLowerCase()} code generated yet.</p>
          <p className="text-xs mt-1">Code is generated after Stage 6 completes.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{active.length} file{active.length !== 1 ? 's' : ''} generated</p>
            <button
              onClick={() => {
                const all = active.map(f => `// === ${f.fileName} ===\n${f.codeContent}`).join('\n\n');
                void navigator.clipboard.writeText(all);
              }}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Copy size={13} /> Copy all
            </button>
          </div>
          {active.map(file => <CodeCard key={file.id} file={file} />)}
        </>
      )}
    </div>
  );
}
