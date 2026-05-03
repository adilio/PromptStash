import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { ConceptInfo } from './ConceptInfo';
import { TEMPLATES, type TemplateWithDifficulty } from '@/lib/templates';
import { createPrompt } from '@/api/prompts';
import { createBundle } from '@/api/bundles';
import { addBundleItem } from '@/api/bundles';
import { promptKeys, bundleKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  currentTeamId?: string;
}

export function TemplateGallery({ open, onClose, currentTeamId }: TemplateGalleryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [difficulty, setDifficulty] = useState<'starter' | 'intermediate' | 'advanced'>('starter');
  const [instantiating, setInstantiating] = useState<string | null>(null);

  const createPromptMutation = useMutation({
    mutationFn: createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  const createBundleMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
    },
  });

  const handleUseTemplate = async (template: TemplateWithDifficulty) => {
    if (!currentTeamId) {
      toast({
        title: 'No workspace',
        description: 'Create a workspace in Settings before using templates.',
        variant: 'destructive',
      });
      return;
    }

    setInstantiating(template.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (template.kind === 'prompt') {
        const created = await createPromptMutation.mutateAsync({
          team_id: currentTeamId,
          title: template.prompt.title,
          body_md: template.prompt.body_md,
          stage: template.prompt.stage ?? null,
          agent_format: template.prompt.agent_format ?? null,
        });
        toast({ title: 'Template created' });
        window.location.href = `/app/p/${created.id}`;
      } else {
        const promptIds: string[] = [];
        for (const item of template.bundle.items) {
          const created = await createPromptMutation.mutateAsync({
            team_id: currentTeamId,
            title: item.title,
            body_md: item.body_md,
            stage: item.stage ?? null,
          });
          promptIds.push(created.id);
        }

        const bundle = await createBundleMutation.mutateAsync({
          team_id: currentTeamId,
          name: template.bundle.name,
          description: template.bundle.description,
          target_format: template.bundle.target_format,
          created_by: user.id,
        });

        for (let i = 0; i < promptIds.length; i++) {
          await addBundleItem(bundle.id, promptIds[i]);
        }

        toast({ title: 'Bundle created' });
        window.location.href = `/app/bundles/${bundle.id}`;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setInstantiating(null);
    }
  };

  if (!open) return null;

  const filteredTemplates = TEMPLATES;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
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
          maxWidth: 720,
          maxHeight: '85vh',
          background: 'var(--ps-bg-elev)',
          borderRadius: 12,
          boxShadow: 'var(--ps-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ps-hairline-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--ps-fg)' }}>
              Browse templates
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ps-fg-muted)', margin: '4px 0 0' }}>
              Pre-built prompts and bundles you can drop into your workspace.
            </p>
          </div>
          <button
            onClick={onClose}
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
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ps-hairline-soft)', display: 'flex', gap: 8 }}>
          {(['starter', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              style={{
                height: 28,
                padding: '0 12px',
                borderRadius: 14,
                border: '1px solid var(--ps-hairline)',
                background: difficulty === level ? 'var(--ps-accent)' : 'var(--ps-bg)',
                color: difficulty === level ? 'var(--ps-accent-fg)' : 'var(--ps-fg)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {level}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                style={{
                  border: '1px solid var(--ps-hairline)',
                  borderRadius: 10,
                  background: 'var(--ps-bg)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ps-fg)' }}>
                        {template.kind === 'prompt' ? template.prompt.title : template.bundle.name}
                      </h3>
                      {template.id === 'qrspi' && <ConceptInfo conceptId="qrspi" />}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ps-fg-muted)', margin: 0, lineHeight: 1.5 }}>
                      {template.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <span style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'var(--ps-bg-sunken)',
                      color: 'var(--ps-fg-faint)',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                    }}>
                      {template.kind}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: template.difficulty === 'starter' ? 'oklch(0.72 0.16 150 / 0.15)' : template.difficulty === 'intermediate' ? 'oklch(0.78 0.16 80 / 0.15)' : 'oklch(0.65 0.20 25 / 0.15)',
                      color: template.difficulty === 'starter' ? 'oklch(0.45 0.12 150)' : template.difficulty === 'intermediate' ? 'oklch(0.55 0.12 80)' : 'oklch(0.55 0.18 25)',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>

                {template.kind === 'bundle' && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Modules ({template.bundle.items.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {template.bundle.items.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'var(--ps-bg-sunken)',
                            color: 'var(--ps-fg-muted)',
                            border: '1px solid var(--ps-hairline-soft)',
                          }}
                        >
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleUseTemplate(template)}
                  disabled={instantiating !== null}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 6,
                    background: 'var(--ps-accent)',
                    color: 'var(--ps-accent-fg)',
                    border: 0,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: instantiating === null ? 'pointer' : 'not-allowed',
                    opacity: instantiating === null ? 1 : 0.6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {instantiating === template.id ? (
                    <>
                      <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      Creating…
                    </>
                  ) : (
                    'Use template'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
