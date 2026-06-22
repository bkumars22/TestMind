import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, PlayCircle, ExternalLink, X } from 'lucide-react';
import {
  getProjects,
  createProject,
  deleteProject,
  getMcpStatus,
  triggerAnalysis,
} from '../services/api';
import { McpStatusDot } from '../components/McpStatusDot';
import { StatusBadge } from '../components/StatusBadge';
import type { Project, McpServerType, McpStatus } from '../types';

const MCP_TYPES: McpServerType[] = ['PLAYWRIGHT', 'GITHUB', 'FILESYSTEM', 'JIRA', 'SLACK'];

interface ProjectCardProps {
  project: Project;
  onDelete: (id: number) => void;
  onAnalyze: (id: number) => void;
  analyzing: boolean;
}

function ProjectCard({ project, onDelete, onAnalyze, analyzing }: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: mcpStatuses = [] } = useQuery<McpStatus[]>({
    queryKey: ['mcp-status', project.id],
    queryFn: () => getMcpStatus(project.id),
    refetchInterval: 60_000,
  });

  const mcpMap = mcpStatuses.reduce<Record<McpServerType, boolean>>(
    (acc, s) => { acc[s.serverType] = s.isActive; return acc; },
    {} as Record<McpServerType, boolean>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            to={`/projects/${project.id}`}
            className="text-base font-semibold text-gray-900 hover:text-brand-600 transition-colors truncate block"
          >
            {project.name}
          </Link>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5 truncate"
          >
            <ExternalLink size={12} />
            {project.repoUrl}
          </a>
        </div>
        <div className="ml-3 shrink-0">
          <StatusBadge status={project.activeTestRun ? 'RUNNING' : 'PENDING'} />
        </div>
      </div>

      {/* MCP status dots */}
      <div className="flex items-center gap-3 mt-4">
        <span className="text-xs text-gray-400 font-medium">MCP:</span>
        {MCP_TYPES.map((type) => (
          <McpStatusDot
            key={type}
            type={type}
            isActive={mcpMap[type] ?? false}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => onAnalyze(project.id)}
          disabled={analyzing || project.activeTestRun}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {analyzing ? (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlayCircle size={15} />
          )}
          Run Analysis
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors border border-red-200"
          >
            <Trash2 size={15} />
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Are you sure?</span>
            <button
              onClick={() => { onDelete(project.id); setConfirmDelete(false); }}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-gray-500 text-xs rounded font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface NewProjectFormProps {
  onClose: () => void;
  onCreate: (data: { name: string; repoUrl: string; githubToken: string }) => void;
  loading: boolean;
}

function NewProjectForm({ onClose, onCreate, loading }: NewProjectFormProps) {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onCreate({ name, repoUrl, githubToken });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">New Project</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            placeholder="My awesome project"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Repo URL</label>
          <input
            type="url"
            required
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            placeholder="https://github.com/org/repo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Token</label>
          <input
            type="password"
            required
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            placeholder="ghp_••••••••••••••••••••"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creating…' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleAnalyze = async (id: number) => {
    setAnalyzingId(id);
    try {
      await triggerAnalysis(id);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your repositories and test analysis</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {showForm && (
        <NewProjectForm
          onClose={() => setShowForm(false)}
          onCreate={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Plus size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No projects yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={(id) => deleteMutation.mutate(id)}
              onAnalyze={handleAnalyze}
              analyzing={analyzingId === project.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
