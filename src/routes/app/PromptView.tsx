import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Share2, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import { ShareDialog } from '@/components/ShareDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { Loading } from '@/components/Loading';
import { getPrompt, deletePrompt } from '@/api/prompts';
import { useToast } from '@/components/ui/use-toast';
import type { PromptWithTags } from '@/lib/types';

export function PromptView() {
  const { promptId } = useParams<{ promptId: string }>();
  const [prompt, setPrompt] = useState<PromptWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (promptId) {
      loadPrompt();
    }
  }, [promptId]);

  const loadPrompt = async () => {
    if (!promptId) return;

    setLoading(true);
    try {
      const data = await getPrompt(promptId);
      setPrompt(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!promptId) return;

    try {
      await deletePrompt(promptId);
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
            onUpdate={setPrompt}
          />
          <VersionHistoryDialog
            promptId={promptId!}
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            onRestore={loadPrompt}
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
