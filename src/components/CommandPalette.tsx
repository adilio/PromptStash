import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Folder, Plus, Filter, Package, BookOpen } from 'lucide-react';
import { listFolders } from '@/api/folders';
import { listPrompts } from '@/api/prompts';
import { listBundles } from '@/api/bundles';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { promptKeys, bundleKeys } from '@/lib/queryClient';
import { useShowAdvanced } from '@/lib/preferences';
import { STAGE_OPTIONS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import type { Stage } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTeamId?: string;
  currentFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onNewPrompt: () => void;
  onStageFilter?: (stage: Stage) => void;
  onBrowseTemplates?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  currentTeamId,
  currentFolderId,
  onFolderChange,
  onNewPrompt,
  onStageFilter,
  onBrowseTemplates,
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
  const hasAnyStagedPromptQuery = useQuery({
    queryKey: ['prompts', 'hasStaged', currentTeamId] as const,
    queryFn: async () => {
      if (!currentTeamId) return false;
      const { count } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', currentTeamId)
        .not('stage', 'is', null);
      return (count ?? 0) > 0;
    },
    enabled: !!currentTeamId && open,
  });
  const prompts = promptsQuery.data ?? [];
  const folders = foldersQuery.data ?? [];
  const hasAnyStagedPrompt = hasAnyStagedPromptQuery.data ?? false;
  const showAdvanced = useShowAdvanced();
  const showStageFilters = hasAnyStagedPrompt || showAdvanced;

  const bundlesQuery = useQuery({
    queryKey: bundleKeys.list(currentTeamId),
    queryFn: () => listBundles(currentTeamId!),
    enabled: !!currentTeamId && open,
  });
  const bundles = bundlesQuery.data ?? [];

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
              {onBrowseTemplates && (
                <CommandItem value="browse templates" onSelect={() => runCommand(onBrowseTemplates)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Browse templates</span>
                </CommandItem>
              )}
            </CommandGroup>
            {showStageFilters && onStageFilter && (
              <CommandGroup heading="Filter by stage">
                {STAGE_OPTIONS.map((stageOption) => (
                  <CommandItem
                    key={stageOption.id}
                    value={`filter by stage ${stageOption.label}`}
                    onSelect={() => runCommand(() => onStageFilter(stageOption.id))}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    <span>Filter by stage: {stageOption.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(bundles.length > 0 || showAdvanced) && (
              <CommandGroup heading="Bundles">
                <CommandItem value="new bundle" onSelect={() => runCommand(() => navigate('/app/bundles/new'))}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>New bundle</span>
                </CommandItem>
                {bundles.map((bundle) => (
                  <CommandItem
                    key={bundle.id}
                    value={`bundle ${bundle.name}`}
                    onSelect={() => runCommand(() => navigate(`/app/bundles/${bundle.id}`))}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>{bundle.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
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
