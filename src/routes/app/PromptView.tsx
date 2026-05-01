import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Share2, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import { ShareDialog } from '@/components/ShareDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { Loading } from '@/components/Loading';
import { getPrompt, deletePrompt } from '@/api/prompts';
import { useToast } from '@/components/ui/use-toast';
import { promptKeys } from '@/lib/queryClient';
import type { PromptWithTags } from '@/lib/types';

export function PromptView() {
  const { promptId } = useParams<{ promptId: string }>();
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const promptQuery = useQuery({
    queryKey: promptKeys.detail(promptId),
    queryFn: () => getPrompt(promptId!),
    enabled: !!promptId,
  });
  const prompt = promptQuery.data;
  const loading = promptQuery.isLoading;

  const deletePromptMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  useEffect(() => {
    if (promptQuery.error) {
      toast({
        title: 'Error',
        description:
          promptQuery.error instanceof Error ? promptQuery.error.message : 'Unknown error',
        variant: 'destructive',
      });
      navigate('/app');
    }
  }, [navigate, promptQuery.error, toast]);

  const handleDelete = async () => {
    if (!promptId) return;

    try {
      await deletePromptMutation.mutateAsync(promptId);
      toast({
        title: 'Success',
        description: 'Prompt deleted',
      });
      navigate('/app');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handlePromptUpdate = (updated: PromptWithTags) => {
    queryClient.setQueryData(promptKeys.detail(promptId), updated);
    queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
  };

  if (loading) {
    return <Loading />;
  }

  if (!prompt) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{prompt.title}</h1>
              <p className="text-sm text-muted-foreground">
                Updated {new Date(prompt.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setVersionHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/p/${promptId}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <MarkdownViewer content={prompt.body_md} />
        </div>
      </div>

      {prompt && (
        <>
          <ShareDialog
            prompt={prompt}
            open={shareOpen}
            onOpenChange={setShareOpen}
            onUpdate={handlePromptUpdate}
          />
          <VersionHistoryDialog
            promptId={promptId!}
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            onRestore={() => void promptQuery.refetch()}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Prompt"
        description="Are you sure you want to delete this prompt? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}
