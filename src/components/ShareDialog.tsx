import { useState } from 'react';
import { Copy, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { makePromptPublic, makePromptPrivate } from '@/api/prompts';
import type { Prompt } from '@/lib/types';

interface ShareDialogProps {
  prompt: Prompt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (prompt: Prompt) => void;
}

export function ShareDialog({ prompt, open, onOpenChange, onUpdate }: ShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const publicUrl = prompt.public_slug
    ? `${window.location.origin}/p/${prompt.public_slug}`
    : '';

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      const updated =
        prompt.visibility === 'public'
          ? await makePromptPrivate(prompt.id)
          : await makePromptPublic(prompt.id);

      onUpdate(updated);
      toast({
        title: 'Success',
        description:
          updated.visibility === 'public'
            ? 'Prompt is now public'
            : 'Prompt is now private',
      });
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

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Copied',
        description: 'Public link copied to clipboard',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Prompt</DialogTitle>
          <DialogDescription>Make this prompt publicly accessible via a link</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">Public Access</span>
            </div>
            <Button
              variant={prompt.visibility === 'public' ? 'default' : 'outline'}
              size="sm"
              onClick={handleTogglePublic}
              disabled={loading}
            >
              {prompt.visibility === 'public' ? 'Enabled' : 'Enable'}
            </Button>
          </div>

          {prompt.visibility === 'public' && publicUrl && (
            <div className="space-y-2">
              <Label>Public Link</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
