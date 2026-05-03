import { useState, useEffect } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { Tag } from '@/lib/types';

interface TagInputProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  inputRef?: Ref<HTMLInputElement>;
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function TagInput({
  availableTags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  inputRef,
  onInputKeyDown,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);

  useEffect(() => {
    if (input.trim()) {
      const filtered = availableTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(input.toLowerCase()) &&
          !selectedTags.find((t) => t.id === tag.id)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [input, availableTags, selectedTags]);

  const handleAddTag = (tag: Tag) => {
    if (!selectedTags.find((t) => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
    setInput('');
    setSuggestions([]);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();

      // Check if tag exists
      const existingTag = availableTags.find(
        (t) => t.name.toLowerCase() === input.toLowerCase()
      );

      if (existingTag) {
        handleAddTag(existingTag);
      } else if (onCreateTag) {
        // Create new tag
        const newTag = await onCreateTag(input.trim());
        handleAddTag(newTag);
      }
    } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
      // Remove last tag if input is empty
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }

    onInputKeyDown?.(e);
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1">
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
          className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[120px] px-0"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="border rounded-md bg-popover">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleAddTag(tag)}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
