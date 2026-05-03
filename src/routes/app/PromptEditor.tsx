import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Share2, Copy, Play, AlertCircle } from 'lucide-react';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import { Loading } from '@/components/Loading';
import { TagInput } from '@/components/TagInput';
import { getPrompt, createPrompt, updatePrompt } from '@/api/prompts';
import { listTags, createTag, addTagToPrompt, removeTagFromPrompt } from '@/api/tags';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { promptKeys } from '@/lib/queryClient';
import type { Tag } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
}

type UpdatePromptPatch = Parameters<typeof updatePrompt>[1];

export function PromptEditor() {
  const { promptId } = useParams<{ promptId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as { initialTitle?: string; initialBody?: string } | null;
  const { currentTeamId } = useOutletContext<ContextType>();
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [title, setTitle] = useState(locationState?.initialTitle ?? '');
  const [body, setBody] = useState(locationState?.initialBody ?? '');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initialLoadRef = useRef(true);

  const isNew = !promptId || promptId === 'new';
  const initialFolderId = searchParams.get('folder');
  const debouncedTitle = useDebounce(title, 2000);
  const debouncedBody = useDebounce(body, 2000);
  const debouncedStatsBody = useDebounce(body, 300);

  const bodyStats = useMemo(() => {
    const trimmed = debouncedStatsBody.trim();
    return {
      tokenCount: Math.ceil(debouncedStatsBody.length / 4),
      wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
    };
  }, [debouncedStatsBody]);

  const promptQuery = useQuery({
    queryKey: promptKeys.detail(promptId),
    queryFn: () => getPrompt(promptId!),
    enabled: !!promptId && !isNew,
  });
  const loading = promptQuery.isLoading;

  const createPromptMutation = useMutation({
    mutationFn: createPrompt,
    onSuccess: (created) => {
      queryClient.setQueryData(promptKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePromptPatch }) =>
      updatePrompt(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(promptKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  useEffect(() => {
    if (currentTeamId) loadTags();
  }, [promptId, currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (promptQuery.data) {
      setTitle(promptQuery.data.title);
      setBody(promptQuery.data.body_md);
      setSelectedTags(promptQuery.data.tags || []);
      initialLoadRef.current = true;
    }
  }, [promptQuery.data]);

  useEffect(() => {
    if (promptQuery.error) {
      toast({
        title: 'Error',
        description: promptQuery.error instanceof Error ? promptQuery.error.message : 'Unknown error',
        variant: 'destructive',
      });
      navigate('/app');
    }
  }, [navigate, promptQuery.error, toast]);

  useEffect(() => {
    const autoSave = async () => {
      if (initialLoadRef.current || isNew || !title.trim()) {
        initialLoadRef.current = false;
        return;
      }
      setAutoSaving(true);
      try {
        await updatePromptMutation.mutateAsync({
          id: promptId!,
          patch: { title: debouncedTitle, body_md: debouncedBody },
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Autosave failed:', error);
      } finally {
        setAutoSaving(false);
      }
    };
    if (!isNew && promptId) autoSave();
  }, [debouncedTitle, debouncedBody]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTags = async () => {
    if (!currentTeamId) return;
    try {
      const tags = await listTags(currentTeamId);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (!currentTeamId) throw new Error('No team selected');
    const newTag = await createTag(currentTeamId, name);
    setAvailableTags([...availableTags, newTag]);
    return newTag;
  };

  const handleTagsChange = async (tags: Tag[]) => {
    const prevTags = selectedTags;
    setSelectedTags(tags);
    if (!isNew && promptId) {
      try {
        const addedTags = tags.filter((t) => !prevTags.find((p) => p.id === t.id));
        for (const tag of addedTags) await addTagToPrompt(promptId, tag.id);
        const removedTags = prevTags.filter((p) => !tags.find((t) => t.id === p.id));
        for (const tag of removedTags) await removeTagFromPrompt(promptId, tag.id);
      } catch (error) {
        setSelectedTags(prevTags);
        toast({ title: 'Error', description: 'Failed to update tags', variant: 'destructive' });
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!currentTeamId && isNew) {
      toast({
        title: 'No workspace',
        description: 'Create a workspace in Settings before saving a prompt.',
        variant: 'destructive',
      });
      navigate('/app/settings');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createPromptMutation.mutateAsync({
          team_id: currentTeamId!,
          folder_id: initialFolderId ?? undefined,
          title,
          body_md: body,
        });
        toast({ title: 'Prompt created' });
        navigate(`/app/p/${created.id}`);
      } else {
        await updatePromptMutation.mutateAsync({ id: promptId!, patch: { title, body_md: body } });
        toast({ title: 'Prompt saved' });
        navigate(`/app/p/${promptId}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useKeyboardShortcut({ key: 's', ctrlKey: true, callback: handleSave });

  useKeyboardShortcut({
    key: '1',
    ctrlKey: true,
    callback: () => setTab('write'),
  });

  useKeyboardShortcut({
    key: '2',
    ctrlKey: true,
    callback: () => setTab('preview'),
  });

  useKeyboardShortcut({
    key: 'c',
    ctrlKey: true,
    shiftKey: true,
    callback: async () => {
      if (body) {
        await navigator.clipboard.writeText(body);
        toast({ title: 'Copied to clipboard' });
      }
    },
  });

  if (loading) return <Loading />;

  const saveStatusText = autoSaving
    ? 'Saving…'
    : lastSaved
    ? `Saved ${lastSaved.toLocaleTimeString()}`
    : isNew
    ? ''
    : 'Unsaved';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--ps-bg)' }}>
      {/* Editor header */}
      <div
        style={{
          padding: '12px 28px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--ps-bg)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() =>
            navigate(
              isNew
                ? initialFolderId
                  ? `/app/f/${initialFolderId}`
                  : '/app'
                : `/app/p/${promptId}`
            )
          }
          style={{
            appearance: 'none',
            border: 0,
            background: 'transparent',
            color: 'var(--ps-fg-muted)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ps-fg-faint)', minWidth: 0, overflow: 'hidden' }}>
          <span>Workspace</span>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
          <span style={{ color: 'var(--ps-fg)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || (isNew ? 'New Prompt' : 'Untitled')}</span>
        </div>

        <style>{`
          @media (min-width: 640px) {
            .mobile-action-bar { display: none !important; }
          }
          @media (max-width: 639px) {
            .desktop-action-buttons { display: none !important; }
          }
        `}</style>

        <div className="desktop-action-buttons" style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {!isNew && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--ps-fg-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {saveStatusText && (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: autoSaving ? 'var(--ps-fg-dim)' : 'oklch(0.58 0.08 160)',
                    }}
                  />
                  {saveStatusText}
                </>
              )}
            </div>
          )}
          <button
            style={ghostBtnStyle}
            title="Share"
          >
            <Share2 style={{ width: 14, height: 14 }} />
            Share
          </button>
          <button
            style={ghostBtnStyle}
            title="Copy prompt"
            onClick={async () => {
              if (body) {
                await navigator.clipboard.writeText(body);
                toast({ title: 'Copied to clipboard' });
              }
            }}
          >
            <Copy style={{ width: 14, height: 14 }} />
            Copy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Play style={{ width: 12, height: 12 }} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* No-workspace banner */}
      {isNew && !currentTeamId && (
        <div
          style={{
            padding: '10px 28px',
            background: 'oklch(0.97 0.02 60)',
            borderBottom: '1px solid oklch(0.88 0.05 60)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'oklch(0.45 0.08 60)',
          }}
        >
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>You need a workspace to save prompts.</span>
          <button
            onClick={() => navigate('/app/settings')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              color: 'oklch(0.45 0.08 60)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Create workspace →
          </button>
        </div>
      )}

      {/* Editor body */}
      <div
        id="editor-body"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '28px 56px 80px',
          maxWidth: 880,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          @media (max-width: 639px) {
            #editor-body {
              padding: 16px 20px 80px !important;
            }
            #prompt-title {
              font-size: 22px !important;
            }
          }
        `}</style>
        {/* Title */}
        <label
          htmlFor="prompt-title"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
        >
          Title
        </label>
        <input
          id="prompt-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled prompt"
          maxLength={140}
          style={{
            width: '100%',
            border: 0,
            outline: 'none',
            background: 'transparent',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 500,
            fontSize: 28,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--ps-fg)',
            padding: 0,
            margin: '0 0 6px',
          }}
        />

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--ps-fg-faint)',
            fontSize: 12.5,
            marginBottom: 22,
          }}
        >
          {!isNew && promptQuery.data && (
            <span>Updated {new Date(promptQuery.data.updated_at).toLocaleDateString()}</span>
          )}
          <span style={{ color: 'var(--ps-fg-dim)' }}>·</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
            ~{bodyStats.tokenCount} tokens · {bodyStats.wordCount} words
          </span>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 20 }}>
          <TagInput
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            onCreateTag={handleCreateTag}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--ps-hairline)',
            marginBottom: 18,
          }}
        >
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
              data-state={tab === t ? 'active' : 'inactive'}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                padding: '8px 14px',
                cursor: 'pointer',
                color: tab === t ? 'var(--ps-fg)' : 'var(--ps-fg-faint)',
                fontSize: 13,
                fontWeight: 500,
                borderBottom: tab === t ? '2px solid var(--ps-accent)' : '2px solid transparent',
                marginBottom: -1,
                fontFamily: 'inherit',
                letterSpacing: '-0.005em',
                transition: 'color 120ms',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Editor area */}
        {tab === 'write' ? (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              placeholder="Write your prompt here. Use {{variable}} for template variables."
              style={{
                width: '100%',
                border: '1px solid var(--ps-hairline)',
                background: 'var(--ps-bg-elev)',
                borderRadius: 10,
                padding: '18px 20px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13.5,
                lineHeight: 1.7,
                color: 'var(--ps-fg)',
                minHeight: 360,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 120ms, box-shadow 120ms',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ps-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--ps-accent-ring)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--ps-hairline)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--ps-fg-faint)',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <span>
                Use{' '}
                <code
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    border: '1px solid var(--ps-hairline)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    background: 'var(--ps-bg-sunken)',
                  }}
                >
                  {'{{var}}'}
                </code>{' '}
                for variables.
              </span>
              <span>
                <code
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    border: '1px solid var(--ps-hairline)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    background: 'var(--ps-bg-sunken)',
                  }}
                >
                  ⌘S
                </code>{' '}
                to save
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              border: '1px solid var(--ps-hairline)',
              borderRadius: 10,
              padding: '18px 24px',
              minHeight: 360,
              background: 'var(--ps-bg-elev)',
            }}
          >
            {body ? <MarkdownViewer content={body} /> : (
              <span style={{ color: 'var(--ps-fg-faint)', fontSize: 13, fontStyle: 'italic' }}>
                Nothing to preview yet.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile action bar */}
      <div className="mobile-action-bar" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--ps-bg)',
        borderTop: '1px solid var(--ps-hairline-soft)',
        padding: '10px 16px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ps-fg-faint)' }}>
          {saveStatusText}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            style={{ ...ghostBtnStyle, height: 32, padding: '0 12px' }}
            title="Share"
          >
            <Share2 style={{ width: 14, height: 14 }} />
          </button>
          <button
            style={{ ...ghostBtnStyle, height: 32, padding: '0 12px' }}
            title="Copy prompt"
            onClick={async () => {
              if (body) {
                await navigator.clipboard.writeText(body);
                toast({ title: 'Copied to clipboard' });
              }
            }}
          >
            <Copy style={{ width: 14, height: 14 }} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 7,
              background: 'var(--ps-accent)',
              color: 'var(--ps-accent-fg)',
              border: 0,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Play style={{ width: 12, height: 12 }} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  borderRadius: 7,
  background: 'var(--ps-bg-elev)',
  border: '1px solid var(--ps-hairline)',
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
