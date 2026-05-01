import { Download, Upload } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useToast } from './ui/use-toast';
import { listPrompts } from '@/api/prompts';
import { createPrompt } from '@/api/prompts';
import type { Prompt } from '@/lib/types';

interface ExportImportDialogProps {
  teamId: string;
  onImportComplete?: () => void;
}

export function ExportImportDialog({ teamId, onImportComplete }: ExportImportDialogProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const prompts = await listPrompts(teamId);

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        prompts: prompts.map((p) => ({
          title: p.title,
          body_md: p.body_md,
          visibility: p.visibility,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptstash-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Exported ${prompts.length} prompts`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error('Invalid export file format');
      }

      let imported = 0;
      for (const promptData of data.prompts) {
        try {
          await createPrompt({
            team_id: teamId,
            title: promptData.title,
            body_md: promptData.body_md,
            visibility: promptData.visibility || 'private',
          });
          imported++;
        } catch (error) {
          console.error('Failed to import prompt:', error);
        }
      }

      toast({
        title: 'Success',
        description: `Imported ${imported} of ${data.prompts.length} prompts`,
      });

      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export/Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export/Import Prompts</DialogTitle>
          <DialogDescription>
            Export your prompts to JSON or import from a previous export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-medium mb-2">Export</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Download all your prompts as a JSON file
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export All Prompts
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Import</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Import prompts from a JSON export file
            </p>
            <label htmlFor="import-file" className="block">
              <Button asChild className="w-full cursor-pointer">
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Prompts
                </span>
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="sr-only"
              />
            </label>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Note:</strong> Imported prompts will be added to your current team.
            Folders and tags are not included in exports.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
