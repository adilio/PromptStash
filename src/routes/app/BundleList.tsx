import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, FileText } from 'lucide-react';
import { listBundles, deleteBundle } from '@/api/bundles';
import { bundleKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AGENT_FORMATS, bundleToFile, downloadFile } from '@/lib/agentExport';
import { ConceptInfo } from '@/components/ConceptInfo';
import type { Bundle } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
}

export function BundleList() {
  const { currentTeamId } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);

  const bundlesQuery = useQuery({
    queryKey: bundleKeys.list(currentTeamId),
    queryFn: () => listBundles(currentTeamId!),
    enabled: !!currentTeamId,
  });

  const bundles = bundlesQuery.data ?? [];

  const deleteBundleMutation = useMutation({
    mutationFn: deleteBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
      toast({ title: 'Bundle deleted' });
    },
  });

  const handleDelete = (bundle: Bundle) => {
    setBundleToDelete(bundle);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!bundleToDelete) return;
    try {
      await deleteBundleMutation.mutateAsync(bundleToDelete.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete bundle',
        variant: 'destructive',
      });
    } finally {
      setDeleteOpen(false);
      setBundleToDelete(null);
    }
  };

  const handleDownloadBundle = async (bundle: Bundle) => {
    try {
      const { filename, content } = await bundleToFile(bundle, []);
      downloadFile(filename, content);
      toast({ title: 'Bundle downloaded' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not download bundle',
        variant: 'destructive',
      });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '22px 32px 16px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          background: 'var(--ps-bg)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h1
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
                fontSize: 24,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--ps-fg)',
              }}
            >
              Bundles
            </h1>
            <ConceptInfo conceptId="bundles" />
          </div>
          <p style={{ color: 'var(--ps-fg-muted)', margin: '4px 0 0', maxWidth: '56ch', fontSize: 14 }}>
            Compose modules into a single agent file like AGENTS.md or CLAUDE.md.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/bundles/new')}
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
          <Plus style={{ width: 14, height: 14 }} />
          New bundle
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px 64px' }}>
        {bundles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ps-fg-muted)' }}>
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
              <FileText style={{ width: 24, height: 24 }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--ps-fg)', margin: '0 0 8px' }}>
              No bundles yet
            </h2>
            <p style={{ margin: '0 0 22px', fontSize: 14 }}>
              Bundles let you compose prompts into complete agent instruction files.
            </p>
            <button
              onClick={() => navigate('/app/bundles/new')}
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
              <Plus style={{ width: 14, height: 14 }} />
              Create a bundle from scratch
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bundles.map((bundle) => {
              const format = AGENT_FORMATS.find(f => f.id === bundle.target_format);
              return (
                <div
                  key={bundle.id}
                  onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                  style={{
                    border: '1px solid var(--ps-hairline)',
                    background: 'var(--ps-bg-elev)',
                    borderRadius: 10,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>
                      {bundle.name}
                    </div>
                    {bundle.description && (
                      <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 6 }}>
                        {bundle.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--ps-fg-faint)' }}>
                      <span>{format?.label || bundle.target_format}</span>
                      <span>•</span>
                      <span>Updated {new Date(bundle.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadBundle(bundle);
                      }}
                      style={{
                        appearance: 'none',
                        border: '1px solid var(--ps-hairline)',
                        background: 'var(--ps-bg-elev)',
                        borderRadius: 7,
                        padding: '6px 10px',
                        color: 'var(--ps-fg)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Download style={{ width: 14, height: 14 }} />
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bundle);
                      }}
                      style={{
                        appearance: 'none',
                        border: '1px solid var(--ps-hairline)',
                        background: 'var(--ps-bg-elev)',
                        borderRadius: 7,
                        padding: '6px 10px',
                        color: 'hsl(var(--destructive))',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}
