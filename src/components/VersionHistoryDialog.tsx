import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { MarkdownViewer } from './MarkdownViewer';
import { useToast } from './ui/use-toast';
import { listPromptVersions, restorePromptVersion } from '@/api/versions';
import type { PromptVersion } from '@/lib/types';

interface VersionHistoryDialogProps {
  promptId: string;
  onRestore?: () => void;
}

export function VersionHistoryDialog({ promptId, onRestore }: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await listPromptVersions(promptId);
      setVersions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      await restorePromptVersion(promptId, versionId);
      toast({
        title: 'Success',
        description: 'Version restored',
      });
      setOpen(false);
      onRestore?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadVersions();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this prompt
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Version List */}
          <ScrollArea className="w-1/3 border rounded-lg">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No versions yet</div>
            ) : (
              <div className="p-2 space-y-2">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-accent border-accent-foreground/20'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{version.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                    {version.change_note && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        {version.change_note}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Version Preview */}
          <div className="flex-1 flex flex-col border rounded-lg">
            {selectedVersion ? (
              <>
                <div className="border-b p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedVersion.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedVersion.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRestore(selectedVersion.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <MarkdownViewer content={selectedVersion.body_md} />
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
