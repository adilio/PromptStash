import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, LayoutGrid, List, Tag, Trash2, GripVertical, X, Filter } from 'lucide-react';
import { PromptCard } from '@/components/PromptCard';
import { PromptCardSkeleton } from '@/components/PromptCardSkeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExportImportDialog } from '@/components/ExportImportDialog';
import { listPrompts, deletePrompt, updatePrompt } from '@/api/prompts';
import { listFolders } from '@/api/folders';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { listTags } from '@/api/tags';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useDragPreview } from '@/hooks/useDragPreview';
import { promptKeys } from '@/lib/queryClient';
import type { PromptWithTags, Folder, Tag as TagType } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
  currentFolderId?: string | null;
  setCurrentFolderId?: (folderId: string | null) => void;
  setFolderDropHandler?: (handler: ((folderId: string | null) => void) | undefined) => void;
}

const EMPTY_PROMPTS: PromptWithTags[] = [];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function PromptListRow({
  prompt,
  onEdit: _onEdit,
  onDelete,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
  focused,
}: {
  prompt: PromptWithTags;
  onEdit?: (p: PromptWithTags) => void;
  onDelete?: (p: PromptWithTags) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, p: PromptWithTags) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  focused?: boolean;
}) {
  const navigate = useNavigate();
  const tags = prompt.tags ?? [];
  const preview = prompt.body_md.slice(0, 90).replace(/\n/g, ' ');

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, prompt)}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/app/p/${prompt.id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: '22px 1fr 160px 130px 32px',
        alignItems: 'center',
        gap: 14,
        padding: '0 14px',
        height: 38,
        borderBottom: '1px solid var(--ps-hairline-soft)',
        cursor: 'pointer',
        opacity: isDragging ? 0.5 : 1,
        outline: focused ? '2px solid var(--ps-accent)' : 'none',
        outlineOffset: -2,
      }}
      className="group list-row"
      onMouseEnter={(e) => {
        if (!focused) (e.currentTarget as HTMLDivElement).style.background = 'var(--ps-bg-sunken)';
      }}
      onMouseLeave={(e) => {
        if (!focused) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      <span
        style={{
          color: 'var(--ps-fg-dim)',
          opacity: 0,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
        }}
        className="group-hover:opacity-100"
      >
        <GripVertical style={{ width: 14, height: 14 }} />
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--ps-fg)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
            maxWidth: '40%',
          }}
        >
          {prompt.title || 'Untitled'}
        </span>
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--ps-fg-faint)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}
        >
          — {preview}
        </span>
      </div>

      <div className="list-row-tags" style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
        {tags.slice(0, 2).map((t) => (
          <span
            key={t.id}
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'var(--ps-bg-sunken)',
              color: 'var(--ps-fg-muted)',
              border: '1px solid var(--ps-hairline-soft)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.name}
          </span>
        ))}
      </div>

      <span
        className="list-row-updated"
        style={{
          fontSize: 12,
          color: 'var(--ps-fg-faint)',
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        {new Date(prompt.updated_at).toLocaleDateString()}
      </span>

      <span
        style={{ opacity: 0, display: 'flex', alignItems: 'center' }}
        className="group-hover:opacity-100"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(prompt);
          }}
          style={{
            appearance: 'none',
            border: 0,
            background: 'transparent',
            color: 'var(--ps-fg-dim)',
            cursor: 'pointer',
            width: 26,
            height: 26,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Delete"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--destructive, red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ps-fg-dim)')}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </span>
    </div>
  );
}

interface Template {
  title: string;
  sub: string;
  body: string;
}

const STARTER_TEMPLATES: Template[] = [
  {
    title: 'Code review companion',
    sub: 'Senior-engineer style review prompt',
    body: `You are a senior software engineer conducting a thorough code review. Analyze the following code with a focus on correctness, readability, maintainability, and performance.

\`\`\`{{language}}
{{code}}
\`\`\`

Review criteria:
- **Correctness**: Are there any bugs, edge cases, or logical errors?
- **Readability**: Is the code clear and self-documenting? Are names meaningful?
- **Maintainability**: Is there duplication? Are abstractions appropriate?
- **Performance**: Are there any obvious inefficiencies?
- **Security**: Are there any potential vulnerabilities?

Provide specific, actionable feedback. For each issue, explain *why* it matters and suggest a concrete fix. Note what's done well too.`,
  },
  {
    title: 'Meeting recap',
    sub: 'Transcript → decisions + action items',
    body: `Convert the following meeting transcript into a clean recap.

<transcript>
{{transcript}}
</transcript>

Format your output as:

## Summary
One paragraph, 2–3 sentences maximum.

## Decisions
- Bulleted list of decisions made

## Action items
| Owner | Action | Due |
|-------|--------|-----|

## Open questions
Items that need follow-up but weren't resolved.`,
  },
  {
    title: 'Cold outreach',
    sub: 'Conversational, low-pressure email',
    body: `Write a short, conversational cold outreach email. Avoid sounding like a template.

About me: {{sender_background}}
About them: {{recipient_name}} at {{company}}, {{recipient_role}}
My goal: {{goal}}
One specific hook: {{personalization_detail}}

Guidelines:
- Under 100 words in the body
- No buzzwords or hype
- One clear ask in the final line
- Subject line: specific and non-spammy`,
  },
  {
    title: 'Research synthesizer',
    sub: 'Themes + verbatim quotes + signals',
    body: `Synthesize the following research material into a structured analysis.

<material>
{{research_material}}
</material>

## Key themes
For each theme: a one-sentence label, 2–3 supporting points, and one verbatim quote from the material.

## Signals worth watching
Emerging patterns or tensions that don't fit neatly into the themes above.

## Gaps
What important questions does this material *not* answer?`,
  },
];

function NoWorkspaceState() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        margin: '64px auto 0',
        maxWidth: 400,
        textAlign: 'center',
        color: 'var(--ps-fg-muted)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 18px',
          border: '1px solid var(--ps-hairline)',
          borderRadius: 14,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ps-fg-faint)',
          background: 'var(--ps-bg-elev)',
          boxShadow: 'var(--ps-shadow-sm)',
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <h2
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          color: 'var(--ps-fg)',
          margin: '0 0 8px',
        }}
      >
        No workspace yet
      </h2>
      <p style={{ margin: '0 0 22px', fontSize: 14 }}>
        Create a workspace first — prompts are organized inside workspaces.
      </p>
      <button
        onClick={() => navigate('/app/settings')}
        style={{
          height: 34,
          padding: '0 14px',
          borderRadius: 8,
          background: 'var(--ps-accent)',
          color: 'var(--ps-accent-fg)',
          border: 0,
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Create workspace
      </button>
    </div>
  );
}

function EmptyDashboard({ onNewPrompt }: { onNewPrompt: (template?: Template) => void }) {
  const recipes = STARTER_TEMPLATES;
  return (
    <div
      style={{
        margin: '64px auto 0',
        maxWidth: 480,
        textAlign: 'center',
        color: 'var(--ps-fg-muted)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 18px',
          border: '1px solid var(--ps-hairline)',
          borderRadius: 14,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ps-fg-faint)',
          background: 'var(--ps-bg-elev)',
          boxShadow: 'var(--ps-shadow-sm)',
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5M9 13h7M9 17h5" />
        </svg>
      </div>
      <h2
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          color: 'var(--ps-fg)',
          margin: '0 0 8px',
        }}
      >
        No prompts yet
      </h2>
      <p style={{ margin: '0 0 22px', fontSize: 14 }}>
        Save the prompts you find yourself rewriting. Variables, versions, folders — it's all here.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={() => onNewPrompt()}
          style={{
            height: 34,
            padding: '0 12px',
            borderRadius: 8,
            background: 'var(--ps-accent)',
            color: 'var(--ps-accent-fg)',
            border: 0,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          New prompt
        </button>
      </div>
      <div
        style={{
          marginTop: 36,
          textAlign: 'left',
          borderTop: '1px solid var(--ps-hairline-soft)',
          paddingTop: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ps-fg-faint)',
            marginBottom: 10,
          }}
        >
          Or start from a template
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {recipes.map((r, i) => (
            <button
              key={i}
              onClick={() => onNewPrompt(r)}
              style={{
                border: '1px solid var(--ps-hairline)',
                background: 'var(--ps-bg-elev)',
                borderRadius: 8,
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ps-accent)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ps-accent-soft)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ps-hairline)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ps-bg-elev)';
              }}
            >
              <span style={{ color: 'var(--ps-accent)', marginTop: 1, flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5 9 9M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5" />
                </svg>
              </span>
              <span>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-fg)' }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)', marginTop: 2 }}>{r.sub}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { folderId } = useParams<{ folderId: string }>();
  const {
    currentTeamId,
    currentFolderId,
    setCurrentFolderId,
    setFolderDropHandler,
  } = useOutletContext<ContextType>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');
  const [draggedPrompt, setDraggedPrompt] = useState<PromptWithTags | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [focusedPromptIndex, setFocusedPromptIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { showPreview, hidePreview, updatePreviewPosition } = useDragPreview();

  const promptsQuery = useQuery({
    queryKey: promptKeys.list(currentTeamId, debouncedSearchQuery),
    queryFn: () => listPrompts(currentTeamId!, undefined, debouncedSearchQuery),
    enabled: !!currentTeamId,
  });
  const prompts = promptsQuery.data ?? EMPTY_PROMPTS;
  const loading = promptsQuery.isLoading;

  const deletePromptMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, folderId: fId }: { id: string; folderId: string | null }) =>
      updatePrompt(id, { folder_id: fId }),
    onSuccess: (updated) => {
      queryClient.setQueryData<PromptWithTags[]>(
        promptKeys.list(currentTeamId, debouncedSearchQuery),
        (previous) =>
          previous?.map((p) => (p.id === updated.id ? { ...p, folder_id: updated.folder_id } : p))
      );
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(updated.id) });
    },
  });

  const filteredPrompts = useMemo(() => {
    let list = prompts;
    if (selectedFolder !== null && selectedFolder !== undefined) {
      list = list.filter((p) => p.folder_id === selectedFolder);
    }
    if (selectedTags.length > 0) {
      list = list.filter((p) => {
        const promptTagIds = p.tags?.map((t) => t.id) ?? [];
        return selectedTags.every((id) => promptTagIds.includes(id));
      });
    }
    return list;
  }, [prompts, selectedFolder, selectedTags]);

  const navigateToNewPrompt = (template?: Template) => {
    const activeFolderId = selectedFolder ?? currentFolderId;
    const search = activeFolderId ? `?folder=${encodeURIComponent(activeFolderId)}` : '';
    navigate(`/app/prompts/new${search}`, template ? { state: { initialTitle: template.title, initialBody: template.body } } : undefined);
  };

  const handleFolderFilterChange = (nextFolderId: string | null) => {
    setSelectedFolder(nextFolderId);
    setCurrentFolderId?.(nextFolderId);
  };

  useEffect(() => {
    if (promptsQuery.error) {
      toast({
        title: 'Error',
        description: promptsQuery.error instanceof Error ? promptsQuery.error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [promptsQuery.error, toast]);

  useEffect(() => {
    const nextFolderId = folderId ?? null;
    setSelectedFolder(nextFolderId);
    setCurrentFolderId?.(nextFolderId);
  }, [folderId, setCurrentFolderId]);

  useEffect(() => {
    if (currentTeamId) {
      loadFolders();
      loadTags();
    }
  }, [currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFolders = async () => {
    if (!currentTeamId) return;
    try {
      const data = await listFolders(currentTeamId);
      setFolders(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const loadTags = async () => {
    if (!currentTeamId) return;
    try {
      const data = await listTags(currentTeamId);
      setAvailableTags(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletePromptId) return;
    try {
      await deletePromptMutation.mutateAsync(deletePromptId);
      toast({ title: 'Prompt deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeletePromptId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, prompt: PromptWithTags) => {
    setDraggedPrompt(prompt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', prompt.id);
    showPreview({ text: `Moving: ${prompt.title}` });
    const handleMouseMove = (ev: MouseEvent) => updatePreviewPosition(ev.clientX, ev.clientY);
    document.addEventListener('mousemove', handleMouseMove);
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragend', cleanup);
    };
    document.addEventListener('dragend', cleanup);
  };

  const handleDragEnd = () => {
    setDraggedPrompt(null);
    hidePreview();
  };

  const handleDrop = async (dropFolderId: string | null) => {
    if (!draggedPrompt) return;
    try {
      await updatePromptMutation.mutateAsync({ id: draggedPrompt.id, folderId: dropFolderId });
      toast({
        title: 'Moved',
        description: `Moved to ${dropFolderId ? folders.find((f) => f.id === dropFolderId)?.name : 'root'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      handleDragEnd();
    }
  };

  useEffect(() => {
    if (setFolderDropHandler) {
      setFolderDropHandler(handleDrop);
    }
    return () => {
      if (setFolderDropHandler) setFolderDropHandler(undefined);
    };
  }, [setFolderDropHandler, draggedPrompt, folders]); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyboardShortcut({
    key: '/',
    callback: () => {
      searchInputRef.current?.focus();
    },
  });

  useEffect(() => {
    setFocusedPromptIndex(-1);
  }, [filteredPrompts.length, searchQuery, selectedFolder, selectedTags]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (filteredPrompts.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedPromptIndex((prev) => Math.min(prev + 1, filteredPrompts.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedPromptIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' && focusedPromptIndex >= 0) {
        event.preventDefault();
        const prompt = filteredPrompts[focusedPromptIndex];
        if (prompt) {
          navigate(`/app/p/${prompt.id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPrompts, focusedPromptIndex, navigate]);

  const currentFolderName = selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name ?? 'Folder'
    : 'Dashboard';

  const isEmpty = !loading && filteredPrompts.length === 0 && !searchQuery;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 767px) {
          #dashboard-header-actions { display: none !important; }
          #dashboard-header { padding: 16px 16px 12px !important; }
        }
      `}</style>
      {/* Main header */}
      <header
        id="dashboard-header"
        style={{
          padding: '22px 32px 16px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          background: 'var(--ps-bg)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ps-fg-faint)',
              marginBottom: 4,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <span>Workspace</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
            <span>{selectedFolder ? currentFolderName : 'All prompts'}</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              letterSpacing: '-0.018em',
              fontWeight: 600,
              color: 'var(--ps-fg)',
            }}
          >
            {currentFolderName}
          </h1>
          <div style={{ marginTop: 4, color: 'var(--ps-fg-muted)', fontSize: 13 }}>
            {!currentTeamId ? 'Set up a workspace to get started.' : isEmpty ? 'Save your first prompt to get started.' : `${filteredPrompts.length} prompt${filteredPrompts.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div id="dashboard-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <ExportImportDialog
            teamId={currentTeamId!}
            onImportComplete={() => void promptsQuery.refetch()}
          />
          <button
            onClick={() => navigateToNewPrompt()}
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 7,
              background: 'var(--ps-accent)',
              color: 'var(--ps-accent-fg)',
              border: 0,
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            New prompt
          </button>
        </div>
      </header>

      {/* Toolbar */}
      {!isEmpty && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 32px',
            borderBottom: '1px solid var(--ps-hairline-soft)',
            background: 'var(--ps-bg)',
            position: 'sticky',
            top: 0,
            zIndex: 5,
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 520 }}>
            <Search
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ps-fg-faint)',
                width: 14,
                height: 14,
              }}
            />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title and content…"
              style={{
                appearance: 'none',
                width: '100%',
                height: 34,
                paddingLeft: 34,
                paddingRight: 40,
                background: 'var(--ps-bg-elev)',
                border: '1px solid var(--ps-hairline)',
                borderRadius: 8,
                color: 'var(--ps-fg)',
                fontFamily: 'inherit',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                color: 'var(--ps-fg-dim)',
                border: '1px solid var(--ps-hairline)',
                borderRadius: 4,
                padding: '1px 5px',
                background: 'var(--ps-bg-sunken)',
                pointerEvents: 'none',
              }}
            >
              ⌘K
            </span>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={{
                appearance: 'none',
                border: '1px solid var(--ps-hairline)',
                background: showFilters ? 'var(--ps-accent-soft)' : 'var(--ps-bg-elev)',
                color: showFilters ? 'var(--ps-accent)' : 'var(--ps-fg-muted)',
                height: 28,
                padding: '0 10px',
                borderRadius: 999,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <Filter style={{ width: 12, height: 12 }} />
              Filters
            </button>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                style={{
                  appearance: 'none',
                  border: '1px solid var(--ps-hairline)',
                  background: 'var(--ps-accent-soft)',
                  color: 'var(--ps-accent)',
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Tag style={{ width: 12, height: 12 }} />
                {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
                <X style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                border: '1px solid var(--ps-hairline)',
                borderRadius: 7,
                background: 'var(--ps-bg-elev)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setLayout('list')}
                title="List view"
                aria-pressed={layout === 'list'}
                style={{
                  appearance: 'none',
                  border: 0,
                  background: layout === 'list' ? 'var(--ps-accent-soft)' : 'transparent',
                  color: layout === 'list' ? 'var(--ps-accent)' : 'var(--ps-fg-faint)',
                  width: 28,
                  height: 26,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid var(--ps-hairline)',
                }}
              >
                <List style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => setLayout('grid')}
                title="Grid view"
                aria-pressed={layout === 'grid'}
                style={{
                  appearance: 'none',
                  border: 0,
                  background: layout === 'grid' ? 'var(--ps-accent-soft)' : 'transparent',
                  color: layout === 'grid' ? 'var(--ps-accent)' : 'var(--ps-fg-faint)',
                  width: 28,
                  height: 26,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayoutGrid style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && !isEmpty && (
        <div
          style={{
            padding: '12px 32px',
            borderBottom: '1px solid var(--ps-hairline-soft)',
            background: 'var(--ps-bg-sunken)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ps-fg-faint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Folder
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <button
                onClick={() => handleFolderFilterChange(null)}
                style={{
                  fontSize: 12.5, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid var(--ps-hairline)',
                  background: selectedFolder === null ? 'var(--ps-accent-soft)' : 'var(--ps-bg-elev)',
                  color: selectedFolder === null ? 'var(--ps-accent)' : 'var(--ps-fg-muted)',
                  fontFamily: 'inherit',
                }}
              >
                All
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderFilterChange(folder.id)}
                  style={{
                    fontSize: 12.5, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid var(--ps-hairline)',
                    background: selectedFolder === folder.id ? 'var(--ps-accent-soft)' : 'var(--ps-bg-elev)',
                    color: selectedFolder === folder.id ? 'var(--ps-accent)' : 'var(--ps-fg-muted)',
                    fontFamily: 'inherit',
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
          {availableTags.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ps-fg-faint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )
                      }
                      style={{
                        fontSize: 12.5, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                        border: '1px solid var(--ps-hairline)',
                        background: active ? 'var(--ps-accent-soft)' : 'var(--ps-bg-elev)',
                        color: active ? 'var(--ps-accent)' : 'var(--ps-fg-muted)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: isEmpty || !currentTeamId ? '0' : '24px 32px 64px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        ) : !currentTeamId ? (
          <NoWorkspaceState />
        ) : isEmpty ? (
          <EmptyDashboard onNewPrompt={navigateToNewPrompt} />
        ) : filteredPrompts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ps-fg-muted)' }}>
            <p>No prompts match your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedTags([]); setSelectedFolder(null); }}
              style={{
                marginTop: 12,
                background: 'none',
                border: 0,
                color: 'var(--ps-accent)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              Clear filters
            </button>
          </div>
        ) : layout === 'list' ? (
          <div
            style={{
              border: '1px solid var(--ps-hairline)',
              borderRadius: 8,
              background: 'var(--ps-bg-elev)',
              overflow: 'hidden',
            }}
          >
            <style>{`
              @media (max-width: 639px) {
                .list-header-row, .list-row {
                  grid-template-columns: 22px 1fr 32px !important;
                }
                .list-header-tags, .list-header-updated, .list-row-tags, .list-row-updated {
                  display: none !important;
                }
              }
            `}</style>
            <div
              className="list-header-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr 160px 130px 32px',
                gap: 14,
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--ps-fg-faint)',
                borderBottom: '1px solid var(--ps-hairline)',
                background: 'var(--ps-bg-sunken)',
              }}
            >
              <span />
              <span>Title</span>
              <span className="list-header-tags">Tags</span>
              <span className="list-header-updated" style={{ textAlign: 'right' }}>Updated</span>
              <span />
            </div>
            {filteredPrompts.map((prompt, index) => (
              <PromptListRow
                key={prompt.id}
                prompt={prompt}
                onEdit={(p) => navigate(`/app/p/${p.id}/edit`)}
                onDelete={(p) => setDeletePromptId(p.id)}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={draggedPrompt?.id === prompt.id}
                focused={focusedPromptIndex === index}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
              gap: 14,
            }}
          >
            {filteredPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onEdit={(p) => navigate(`/app/p/${p.id}/edit`)}
                onDelete={(p) => setDeletePromptId(p.id)}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={draggedPrompt?.id === prompt.id}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletePromptId}
        onOpenChange={(open) => !open && setDeletePromptId(null)}
        title="Delete Prompt"
        description="Are you sure you want to delete this prompt? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}
