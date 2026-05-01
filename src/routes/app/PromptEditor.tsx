import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import { Loading } from '@/components/Loading';
import { TagInput } from '@/components/TagInput';
import { getPrompt, createPrompt, updatePrompt } from '@/api/prompts';
import { listTags, createTag, addTagToPrompt, removeTagFromPrompt } from '@/api/tags';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import type { Tag } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
}

export function PromptEditor() {
  const { promptId } = useParams<{ promptId: string }>();
  const { currentTeamId } = useOutletContext<ContextType>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialLoadRef = useRef(true);

  const isNew = !promptId || promptId === 'new';
  const debouncedTitle = useDebounce(title, 2000);
  const debouncedBody = useDebounce(body, 2000);

  useEffect(() => {
    if (promptId && !isNew) {
      loadPrompt();
    }
    if (currentTeamId) {
      loadTags();
    }
  }, [promptId, currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTags = async () => {
    if (!currentTeamId) return;

    try {
      const tags = await listTags(currentTeamId);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Autosave effect
  useEffect(() => {
    const autoSave = async () => {
      // Skip autosave on initial load or for new prompts
      if (initialLoadRef.current || isNew || !title.trim()) {
        initialLoadRef.current = false;
        return;
      }

      setAutoSaving(true);
      try {
        await updatePrompt(promptId!, {
          title: debouncedTitle,
          body_md: debouncedBody,
        });
        setLastSaved(new Date());
      } catch (error) {
        // Silent fail for autosave
        console.error('Autosave failed:', error);
      } finally {
        setAutoSaving(false);
      }
    };

    if (!isNew && promptId) {
      autoSave();
    }
  }, [debouncedTitle, debouncedBody]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrompt = async () => {
    if (!promptId || isNew) return;

    setLoading(true);
    try {
      const data = await getPrompt(promptId);
      setTitle(data.title);
      setBody(data.body_md);
      setSelectedTags(data.tags || []);
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

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (!currentTeamId) throw new Error('No team selected');

    const newTag = await createTag(currentTeamId, name);

    setAvailableTags([...availableTags, newTag]);
    return newTag;
  };

  const handleTagsChange = async (tags: Tag[]) => {
    const prevTags = selectedTags;
    setSelectedTags(tags);

    // Only sync tags if editing existing prompt
    if (!isNew && promptId) {
      try {
        // Find added tags
        const addedTags = tags.filter((t) => !prevTags.find((p) => p.id === t.id));
        for (const tag of addedTags) {
          await addTagToPrompt(promptId, tag.id);
        }

        // Find removed tags
        const removedTags = prevTags.filter((p) => !tags.find((t) => t.id === p.id));
        for (const tag of removedTags) {
          await removeTagFromPrompt(promptId, tag.id);
        }
      } catch (error) {
        // Revert on error
        setSelectedTags(prevTags);
        toast({
          title: 'Error',
          description: 'Failed to update tags',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!currentTeamId && isNew) {
      toast({
        title: 'Error',
        description: 'Please select a team',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const created = await createPrompt({
          team_id: currentTeamId!,
          title,
          body_md: body,
        });
        toast({
          title: 'Success',
          description: 'Prompt created',
        });
        navigate(`/app/p/${created.id}`);
      } else {
        await updatePrompt(promptId!, {
          title,
          body_md: body,
        });
        toast({
          title: 'Success',
          description: 'Prompt updated',
        });
        navigate(`/app/p/${promptId}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for save
  useKeyboardShortcut({
    key: 's',
    ctrlKey: true,
    callback: handleSave,
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isNew ? '/app' : `/app/p/${promptId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isNew ? 'New Prompt' : 'Edit Prompt'}</h1>
              {!isNew && (
                <p className="text-xs text-muted-foreground">
                  {autoSaving
                    ? 'Saving...'
                    : lastSaved
                    ? `Last saved ${lastSaved.toLocaleTimeString()}`
                    : ''}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter prompt title..."
              maxLength={140}
            />
          </div>

          <TagInput
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            onCreateTag={handleCreateTag}
          />

          <Tabs defaultValue="edit" className="flex-1">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4 h-[500px]">
              <MarkdownEditor value={body} onChange={setBody} />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg p-6 min-h-[500px]">
                <MarkdownViewer content={body} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
