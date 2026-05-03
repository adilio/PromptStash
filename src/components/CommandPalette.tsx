import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Folder, Plus } from 'lucide-react';
import { listFolders } from '@/api/folders';
import { listPrompts } from '@/api/prompts';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { promptKeys } from '@/lib/queryClient';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTeamId?: string;
  currentFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onNewPrompt: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  currentTeamId,
  currentFolderId,
  onFolderChange,
  onNewPrompt,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const promptsQuery = useQuery({
    queryKey: promptKeys.list(currentTeamId, ''),
    queryFn: () => listPrompts(currentTeamId!),
    enabled: !!currentTeamId && open,
  });
  const foldersQuery = useQuery({
    queryKey: ['folders', currentTeamId],
    queryFn: () => listFolders(currentTeamId!),
    enabled: !!currentTeamId && open,
  });
  const prompts = promptsQuery.data ?? [];
  const folders = foldersQuery.data ?? [];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command>
          <CommandInput placeholder="Search prompts, folders, actions..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem value="new prompt create" onSelect={() => runCommand(onNewPrompt)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Prompt</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ps-fg-faint)', fontFamily: '"JetBrains Mono", monospace' }}>N</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Prompts">
              {prompts.map((prompt) => (
                <CommandItem
                  key={prompt.id}
                  value={`prompt ${prompt.title}`}
                  onSelect={() => runCommand(() => navigate(`/app/p/${prompt.id}`))}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{prompt.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Folders">
              <CommandItem
                value="folder all dashboard"
                onSelect={() =>
                  runCommand(() => {
                    onFolderChange?.(null);
                    navigate('/app');
                  })
                }
              >
                <Folder className="mr-2 h-4 w-4" />
                <span>All Folders</span>
              </CommandItem>
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  value={`folder ${folder.name}`}
                  onSelect={() =>
                    runCommand(() => {
                      onFolderChange?.(folder.id);
                      navigate(`/app/f/${folder.id}`);
                    })
                  }
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span>{folder.name}</span>
                  {currentFolderId === folder.id && (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
