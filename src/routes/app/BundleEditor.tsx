import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { GripVertical, Plus, Trash2, Download, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { getBundle, createBundle, updateBundle, deleteBundle, addBundleItem, removeBundleItem, reorderBundleItems, setBundleItemIncluded } from '@/api/bundles';
import { listPrompts } from '@/api/prompts';
import { bundleKeys, promptKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ConceptInfo } from '@/components/ConceptInfo';
import { AGENT_FORMATS, bundleToFile, downloadFile } from '@/lib/agentExport';
import { STAGE_OPTIONS } from '@/lib/types';
import { estimateTokens, getZone, zoneColor, MODEL_CONTEXTS, type ModelKey } from '@/lib/tokens';
import { supabase } from '@/lib/supabase';
import type { Stage, AgentFormat } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
}

export function BundleEditor() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const { currentTeamId } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = !bundleId || bundleId === 'new';
  const initialLoadRef = useRef(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetFormat, setTargetFormat] = useState<AgentFormat>('agents');
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addPromptOpen, setAddPromptOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<ModelKey>('claude-sonnet');

  const debouncedName = useDebounce(name, 2000);
  const debouncedDescription = useDebounce(description, 2000);
  const debouncedTargetFormat = useDebounce(targetFormat, 2000);

  const bundleQuery = useQuery({
    queryKey: bundleKeys.detail(bundleId),
    queryFn: () => getBundle(bundleId!),
    enabled: !!bundleId && !isNew,
  });

  const promptsQuery = useQuery({
    queryKey: promptKeys.list(currentTeamId),
    queryFn: () => listPrompts(currentTeamId!),
    enabled: !!currentTeamId && addPromptOpen,
  });

  const createBundleMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: (created) => {
      queryClient.setQueryData(bundleKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
      navigate(`/app/bundles/${created.id}`, { replace: true });
    },
  });

  const updateBundleMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateBundle>[1] }) =>
      updateBundle(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(bundleKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: deleteBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
      toast({ title: 'Bundle deleted' });
      navigate('/app/bundles');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ promptId }: { promptId: string }) => addBundleItem(bundleId!, promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.detail(bundleId) });
      toast({ title: 'Prompt added to bundle' });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ promptId }: { promptId: string }) => removeBundleItem(bundleId!, promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.detail(bundleId) });
    },
  });

  const toggleIncludedMutation = useMutation({
    mutationFn: ({ promptId, included }: { promptId: string; included: boolean }) =>
      setBundleItemIncluded(bundleId!, promptId, included),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.detail(bundleId) });
    },
  });

  useEffect(() => {
    if (bundleQuery.data) {
      setName(bundleQuery.data.name);
      setDescription(bundleQuery.data.description ?? '');
      setTargetFormat(bundleQuery.data.target_format as AgentFormat);
      initialLoadRef.current = true;
    }
  }, [bundleQuery.data]);

  useEffect(() => {
    if (bundleQuery.error) {
      toast({
        title: 'Error',
        description: bundleQuery.error instanceof Error ? bundleQuery.error.message : 'Unknown error',
        variant: 'destructive',
      });
      navigate('/app/bundles');
    }
  }, [navigate, bundleQuery.error, toast]);

  useEffect(() => {
    const autoSave = async () => {
      if (initialLoadRef.current || isNew || !name.trim()) {
        initialLoadRef.current = false;
        return;
      }
      setAutoSaving(true);
      try {
        await updateBundleMutation.mutateAsync({
          id: bundleId!,
          patch: { name: debouncedName, description: debouncedDescription, target_format: debouncedTargetFormat },
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Autosave failed:', error);
      } finally {
        setAutoSaving(false);
      }
    };
    if (!isNew && bundleId) autoSave();
  }, [bundleId, isNew, name, updateBundleMutation, debouncedName, debouncedDescription, debouncedTargetFormat]);

  const handleSave = async () => {
    if (!currentTeamId || !name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    if (isNew) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: 'Error',
            description: 'You must be logged in to create a bundle',
            variant: 'destructive',
          });
          return;
        }
        await createBundleMutation.mutateAsync({
          team_id: currentTeamId,
          name: name.trim(),
          description: description.trim() || undefined,
          target_format: targetFormat,
          created_by: user.id,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Could not create bundle',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = () => {
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!bundleId) return;
    try {
      await deleteBundleMutation.mutateAsync(bundleId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete bundle',
        variant: 'destructive',
      });
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleAddPrompt = async (promptId: string) => {
    if (!bundleId) return;
    try {
      await addItemMutation.mutateAsync({ promptId });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not add prompt to bundle',
        variant: 'destructive',
      });
    }
  };

  const handleRemovePrompt = async (promptId: string) => {
    if (!bundleId) return;
    try {
      await removeItemMutation.mutateAsync({ promptId });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not remove prompt from bundle',
        variant: 'destructive',
      });
    }
  };

  const handleToggleIncluded = async (promptId: string, included: boolean) => {
    if (!bundleId) return;
    try {
      await toggleIncludedMutation.mutateAsync({ promptId, included });
    } catch (error) {
      console.error('Failed to toggle included:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, promptId: string) => {
    e.dataTransfer.setData('text/plain', promptId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetPromptId: string) => {
    e.preventDefault();
    const draggedPromptId = e.dataTransfer.getData('text/plain');
    if (!bundleId || draggedPromptId === targetPromptId) return;

    const bundle = bundleQuery.data;
    if (!bundle) return;

    const newOrder = bundle.items
      .filter(item => item.prompt_id !== draggedPromptId && item.prompt_id !== targetPromptId)
      .map(item => item.prompt_id);

    const draggedItem = bundle.items.find(item => item.prompt_id === draggedPromptId);
    const targetItem = bundle.items.find(item => item.prompt_id === targetPromptId);

    if (draggedItem && targetItem) {
      const targetIndex = bundle.items.findIndex(item => item.prompt_id === targetPromptId);
      newOrder.splice(targetIndex, 0, draggedPromptId);

      try {
        await reorderBundleItems(bundleId, newOrder);
        queryClient.invalidateQueries({ queryKey: bundleKeys.detail(bundleId) });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Could not reorder items',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const bundle = bundleQuery.data;
  const allPrompts = promptsQuery.data ?? [];
  const bundlePromptIds = new Set(bundle?.items.map(item => item.prompt_id) ?? []);
  const availablePrompts = allPrompts.filter(p => !bundlePromptIds.has(p.id));
  const filteredPrompts = stageFilter === 'all'
    ? availablePrompts
    : availablePrompts.filter(p => p.stage === stageFilter);

  const { filename, content } = bundle ? bundleToFile(bundle, bundle.items) : { filename: '', content: '' };

  const includedItems = bundle?.items.filter(item => item.included) ?? [];
  const totalTokens = includedItems.reduce((sum, item) => sum + estimateTokens(item.prompt.body_md), 0);
  const contextSize = MODEL_CONTEXTS[selectedModel];
  const zone = getZone(totalTokens, contextSize);
  const ratio = totalTokens / contextSize;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'var(--ps-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/app/bundles')}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              color: 'var(--ps-fg)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
            }}
          >
            ←
          </button>
          <h1
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
              fontSize: 20,
              margin: 0,
              color: 'var(--ps-fg)',
            }}
          >
            {isNew ? 'New bundle' : bundle?.name ?? 'Loading...'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {autoSaving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ps-fg-faint)' }}>
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              Saving...
            </div>
          )}
          {!isNew && lastSaved && (
            <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)' }}>
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={() => downloadFile(filename, content)}
            disabled={!bundle}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              background: 'var(--ps-bg-elev)',
              color: 'var(--ps-fg)',
              border: '1px solid var(--ps-hairline)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              cursor: bundle ? 'pointer' : 'not-allowed',
              opacity: bundle ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Download
          </button>
          {isNew ? (
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                background: name.trim() ? 'var(--ps-accent)' : 'var(--ps-fg-faint)',
                color: name.trim() ? 'var(--ps-accent-fg)' : 'var(--ps-fg-dim)',
                border: 0,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
          ) : (
            <button
              onClick={handleDelete}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                background: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
                border: '1px solid hsl(var(--destructive) / 0.2)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--ps-fg)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My AGENTS.md Bundle"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--ps-hairline)',
                    background: 'var(--ps-bg-elev)',
                    color: 'var(--ps-fg)',
                    fontFamily: 'inherit',
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--ps-fg)' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A complete set of instructions for..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--ps-hairline)',
                    background: 'var(--ps-bg-elev)',
                    color: 'var(--ps-fg)',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--ps-fg)' }}>
                  Target format
                </label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as AgentFormat)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--ps-hairline)',
                    background: 'var(--ps-bg-elev)',
                    color: 'var(--ps-fg)',
                    fontFamily: 'inherit',
                    fontSize: 14,
                  }}
                >
                  {AGENT_FORMATS.map(format => (
                    <option key={format.id} value={format.id}>{format.label}</option>
                  ))}
                </select>
              </div>

              {!isNew && bundle && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ps-fg)' }}>
                      Modules ({bundle.items.length})
                    </h2>
                    <button
                      onClick={() => setAddPromptOpen(true)}
                      style={{
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 6,
                        background: 'var(--ps-accent)',
                        color: 'var(--ps-accent-fg)',
                        border: 0,
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      Add module
                    </button>
                  </div>

                  {bundle.items.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '32px 16px',
                      border: '1px dashed var(--ps-hairline)',
                      borderRadius: 8,
                      color: 'var(--ps-fg-muted)',
                    }}>
                      No modules yet. Add prompts to build your bundle.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {bundle.items.map((item) => {
                        const stage = item.prompt.stage ? STAGE_OPTIONS.find(s => s.id === item.prompt.stage) : null;
                        const isExpanded = expandedItems.has(item.prompt_id);

                        return (
                          <div
                            key={item.prompt_id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.prompt_id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, item.prompt_id)}
                            style={{
                              border: '1px solid var(--ps-hairline)',
                              borderRadius: 8,
                              background: 'var(--ps-bg-elev)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 12px',
                                cursor: 'grab',
                              }}
                            >
                              <GripVertical style={{ width: 14, height: 14, color: 'var(--ps-fg-dim)', flexShrink: 0 }} />
                              <input
                                type="checkbox"
                                checked={item.included}
                                onChange={(e) => handleToggleIncluded(item.prompt_id, e.target.checked)}
                                style={{ flexShrink: 0, cursor: 'pointer' }}
                              />
                              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: item.included ? 'var(--ps-fg)' : 'var(--ps-fg-dim)' }}>
                                {item.prompt.title}
                              </span>
                              {stage && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: stage.color + '20',
                                  color: stage.color,
                                }}>
                                  {stage.short}
                                </span>
                              )}
                              <button
                                onClick={() => toggleItemExpanded(item.prompt_id)}
                                style={{
                                  appearance: 'none',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--ps-fg-faint)',
                                  cursor: 'pointer',
                                  padding: 2,
                                  borderRadius: 4,
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronUp style={{ width: 14, height: 14 }} />
                                ) : (
                                  <ChevronDown style={{ width: 14, height: 14 }} />
                                )}
                              </button>
                              <button
                                onClick={() => handleRemovePrompt(item.prompt_id)}
                                style={{
                                  appearance: 'none',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'hsl(var(--destructive))',
                                  cursor: 'pointer',
                                  padding: 2,
                                  borderRadius: 4,
                                }}
                              >
                                <Trash2 style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                            {isExpanded && (
                              <div style={{ padding: '0 12px 12px', fontSize: 13, color: 'var(--ps-fg-muted)' }}>
                                {item.prompt.body_md.slice(0, 200)}
                                {item.prompt.body_md.length > 200 && '...'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!isNew && bundle && (
          <div style={{
            width: 400,
            borderLeft: '1px solid var(--ps-hairline-soft)',
            background: 'var(--ps-bg-sunken)',
            overflowY: 'auto',
            padding: 16,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--ps-fg)' }}>
              Preview: {filename}
            </h3>

            <div style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              background: 'var(--ps-bg-elev)',
              border: '1px solid var(--ps-hairline)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ps-fg)' }}>
                  Context budget
                </span>
                <ConceptInfo conceptId="dumb-zone" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelKey)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--ps-hairline)',
                    background: 'var(--ps-bg)',
                    color: 'var(--ps-fg)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                  }}
                >
                  <option value="claude-sonnet">Claude Sonnet (200k)</option>
                  <option value="claude-opus">Claude Opus (200k)</option>
                  <option value="gpt-5">GPT-5 (400k)</option>
                </select>
              </div>

              <div style={{
                position: 'relative',
                height: 8,
                borderRadius: 4,
                background: 'var(--ps-bg-sunken)',
                marginBottom: 8,
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(ratio * 100, 100)}%`,
                    background: zoneColor(zone),
                    transition: 'width 120ms, background 120ms',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '40%',
                    top: 0,
                    width: 1,
                    height: '100%',
                    background: 'var(--ps-fg-dim)',
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '60%',
                    top: 0,
                    width: 1,
                    height: '100%',
                    background: 'var(--ps-fg-dim)',
                    opacity: 0.5,
                  }}
                />
              </div>

              <div style={{
                fontSize: 11,
                color: 'var(--ps-fg-faint)',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span>0%</span>
                <span>40%</span>
                <span>60%</span>
                <span>100%</span>
              </div>

              <div style={{
                fontSize: 11.5,
                color: 'var(--ps-fg-muted)',
                textAlign: 'center',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                ≈ {totalTokens.toLocaleString()} tokens • {Math.round(ratio * 100)}% of {selectedModel} • Zone: <span style={{ color: zoneColor(zone), fontWeight: 500 }}>{zone.charAt(0).toUpperCase() + zone.slice(1)}</span>
              </div>

              {(zone === 'warning' || zone === 'danger') && (
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid var(--ps-hairline-soft)',
                  fontSize: 11,
                  color: 'var(--ps-fg-muted)',
                  lineHeight: 1.4,
                }}>
                  This bundle is approaching the Dumb Zone — consider splitting modules or moving detail into sub-agent instructions.
                </div>
              )}
            </div>

            <pre
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--ps-fg)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {content}
            </pre>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Bundle"
        description="Are you sure you want to delete this bundle? This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
      />

      {addPromptOpen && (
        <div
          onClick={() => setAddPromptOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              background: 'var(--ps-bg-elev)',
              borderRadius: 12,
              boxShadow: 'var(--ps-shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ps-hairline-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--ps-fg)' }}>
                Add module to bundle
              </h2>
              <button
                onClick={() => setAddPromptOpen(false)}
                style={{
                  appearance: 'none',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ps-fg-faint)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--ps-hairline-soft)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setStageFilter('all')}
                style={{
                  height: 26,
                  padding: '0 10px',
                  borderRadius: 13,
                  border: '1px solid var(--ps-hairline)',
                  background: stageFilter === 'all' ? 'var(--ps-accent)' : 'var(--ps-bg-elev)',
                  color: stageFilter === 'all' ? 'var(--ps-accent-fg)' : 'var(--ps-fg)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {STAGE_OPTIONS.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setStageFilter(stage.id)}
                  style={{
                    height: 26,
                    padding: '0 10px',
                    borderRadius: 13,
                    border: '1px solid var(--ps-hairline)',
                    background: stageFilter === stage.id ? stage.color : 'var(--ps-bg-elev)',
                    color: stageFilter === stage.id ? 'white' : 'var(--ps-fg)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {stage.short}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {filteredPrompts.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ps-fg-muted)', fontSize: 13 }}>
                  {availablePrompts.length === 0
                    ? 'No prompts available. Create some prompts first.'
                    : 'No prompts match this stage filter.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredPrompts.map(prompt => {
                    const stage = prompt.stage ? STAGE_OPTIONS.find(s => s.id === prompt.stage) : null;
                    return (
                      <button
                        key={prompt.id}
                        onClick={() => {
                          handleAddPrompt(prompt.id);
                          setAddPromptOpen(false);
                        }}
                        style={{
                          padding: '12px 20px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--ps-fg)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 14,
                        }}
                      >
                        <span style={{ flex: 1 }}>{prompt.title}</span>
                        {stage && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: stage.color + '20',
                            color: stage.color,
                          }}>
                            {stage.short}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
