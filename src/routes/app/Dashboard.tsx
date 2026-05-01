import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Filter, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PromptCard } from '@/components/PromptCard';
import { PromptCardSkeleton } from '@/components/PromptCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DragAndDropHelp } from '@/components/DragAndDropHelp';
import { ExportImportDialog } from '@/components/ExportImportDialog';
import { listPrompts, deletePrompt, updatePrompt } from '@/api/prompts';
import { listFolders } from '@/api/folders';
import { listTags } from '@/api/tags';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useDragPreview } from '@/hooks/useDragPreview';
import { promptKeys } from '@/lib/queryClient';
import type { PromptWithTags, Folder, Tag } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
  setFolderDropHandler?: (handler: ((folderId: string | null) => void) | undefined) => void;
}

const EMPTY_PROMPTS: PromptWithTags[] = [];

export function Dashboard() {
  const { currentTeamId, setFolderDropHandler } = useOutletContext<ContextType>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);

  // Bulk operations state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedPrompt, setDraggedPrompt] = useState<PromptWithTags | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showDropZones, setShowDropZones] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_dropZoneHover, setDropZoneHover] = useState<string | null>(null);

  // Filter state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showPreview, hidePreview, updatePreviewPosition } = useDragPreview();
  const promptsQuery = useQuery({
    queryKey: promptKeys.list(currentTeamId, debouncedSearchQuery),
    queryFn: () => listPrompts(currentTeamId!, undefined, debouncedSearchQuery),
    enabled: !!currentTeamId,
  });
  const prompts = promptsQuery.data ?? EMPTY_PROMPTS;
  const loading = promptsQuery.isLoading;

  const deletePromptMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      updatePrompt(id, { folder_id: folderId }),
    onSuccess: (updated) => {
      queryClient.setQueryData<PromptWithTags[]>(
        promptKeys.list(currentTeamId, debouncedSearchQuery),
        (previous) =>
          previous?.map((prompt) =>
            prompt.id === updated.id ? { ...prompt, folder_id: updated.folder_id } : prompt
          )
      );
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(updated.id) });
    },
  });

  // Filter prompts based on selected folder and tags
  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      // Folder filter
      if (selectedFolder !== null && prompt.folder_id !== selectedFolder) {
        return false;
      }

      // Tag filter (client-side)
      if (selectedTags.length > 0) {
        const promptTagIds = prompt.tags?.map((t: Tag) => t.id) || [];
        const hasAllSelectedTags = selectedTags.every((tagId) =>
          promptTagIds.includes(tagId)
        );
        if (!hasAllSelectedTags) {
          return false;
        }
      }

      return true;
    });
  }, [prompts, selectedFolder, selectedTags]);

  // Keyboard shortcuts
  useKeyboardShortcut({
    key: 'n',
    ctrlKey: true,
    callback: () => navigate('/app/p/new'),
  });

  useKeyboardShortcut({
    key: 'k',
    ctrlKey: true,
    callback: () => searchInputRef.current?.focus(),
  });

  useEffect(() => {
    if (promptsQuery.error) {
      toast({
        title: 'Error',
        description:
          promptsQuery.error instanceof Error ? promptsQuery.error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [promptsQuery.error, toast]);

  useEffect(() => {
    if (currentTeamId) {
      loadFolders();
      loadTags();
    }
  }, [currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetchPrompts = () => {
    void promptsQuery.refetch();
  };

  const loadFolders = async () => {
    if (!currentTeamId) return;

    try {
      const data = await listFolders(currentTeamId);
      setFolders(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const loadTags = async () => {
    if (!currentTeamId) return;

    try {
      const data = await listTags(currentTeamId);
      setAvailableTags(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletePromptId) return;

    try {
      await deletePromptMutation.mutateAsync(deletePromptId);
      toast({
        title: 'Success',
        description: 'Prompt deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeletePromptId(null);
    }
  };

  const togglePromptSelection = (promptId: string) => {
    setSelectedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(promptId)) {
        next.delete(promptId);
      } else {
        next.add(promptId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPrompts.size === filteredPrompts.length) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(filteredPrompts.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPrompts.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedPrompts).map((id) => deletePromptMutation.mutateAsync(id))
      );
      setSelectedPrompts(new Set());
      setBulkMode(false);
      toast({
        title: 'Success',
        description: `${selectedPrompts.size} prompt(s) deleted`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, prompt: PromptWithTags) => {
    setDraggedPrompt(prompt);
    setShowDropZones(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', prompt.id);

    // Show custom drag preview
    showPreview({ text: `Moving: ${prompt.title}` });

    // Track mouse position for custom preview
    const handleMouseMove = (e: MouseEvent) => {
      updatePreviewPosition(e.clientX, e.clientY);
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Clean up on drag end
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('dragend', cleanup);
    };
    document.addEventListener('dragend', cleanup);
  };

  const handleDragEnd = () => {
    setDraggedPrompt(null);
    setShowDropZones(false);
    setDropZoneHover(null);
    hidePreview();
  };

  const handleDrop = async (folderId: string | null) => {
    if (!draggedPrompt) return;

    try {
      await updatePromptMutation.mutateAsync({ id: draggedPrompt.id, folderId });

      toast({
        title: 'Success',
        description: `Moved to ${folderId ? folders.find(f => f.id === folderId)?.name : 'root'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      handleDragEnd();
    }
  };

  // Register folder drop handler for sidebar
  useEffect(() => {
    if (setFolderDropHandler) {
      setFolderDropHandler(handleDrop);
    }
    return () => {
      if (setFolderDropHandler) {
        setFolderDropHandler(undefined);
      }
    };
  }, [setFolderDropHandler, draggedPrompt, folders]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Manage your prompts and organize them into folders
              </p>
              <DragAndDropHelp />
            </div>
          </div>
          <div className="flex gap-2">
            {bulkMode && selectedPrompts.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedPrompts.size}
              </Button>
            )}
            <ExportImportDialog teamId={currentTeamId!} onImportComplete={refetchPrompts} />
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedPrompts(new Set());
              }}
            >
              {bulkMode ? 'Cancel' : 'Select'}
            </Button>
            <Button onClick={() => navigate('/app/p/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search title and content"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              {/* Folder Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Folder</label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedFolder === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedFolder(null)}
                  >
                    All Folders
                  </Badge>
                  {folders.map((folder) => (
                    <Badge
                      key={folder.id}
                      variant={selectedFolder === folder.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedFolder(folder.id)}
                    >
                      {folder.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                    >
                      {tag.name}
                      {selectedTags.includes(tag.id) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedFolder || selectedTags.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFolder(null);
                    setSelectedTags([]);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        ) : !currentTeamId ? (
          <EmptyState
            icon={FileText}
            title="Create your first team"
            description="Teams keep your prompts, folders, and tags organized."
            action={{
              label: 'Go to Settings',
              onClick: () => navigate('/app/settings'),
            }}
          />
        ) : filteredPrompts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No prompts yet"
            description="Create your first prompt to get started"
            action={{
              label: 'New Prompt',
              onClick: () => navigate('/app/p/new'),
            }}
          />
        ) : (
          <div>
            {bulkMode && (
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={selectedPrompts.size === filteredPrompts.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedPrompts.size === filteredPrompts.length ? 'Deselect' : 'Select'} all
                </span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="relative">
                  {bulkMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedPrompts.has(prompt.id)}
                        onCheckedChange={() => togglePromptSelection(prompt.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <PromptCard
                    prompt={prompt}
                    onEdit={(p) => navigate(`/app/p/${p.id}/edit`)}
                    onDelete={(p) => setDeletePromptId(p.id)}
                    draggable={!bulkMode}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedPrompt?.id === prompt.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletePromptId}
        onOpenChange={(open) => !open && setDeletePromptId(null)}
        title="Delete Prompt"
        description="Are you sure you want to delete this prompt? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}
