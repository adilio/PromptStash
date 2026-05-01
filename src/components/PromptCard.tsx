import { Link } from 'react-router-dom';
import { Copy, MoreHorizontal, Trash2, Edit, Globe, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useToast } from './ui/use-toast';
import type { PromptWithTags } from '@/lib/types';

interface PromptCardProps {
  prompt: PromptWithTags;
  onEdit?: (prompt: PromptWithTags) => void;
  onDelete?: (prompt: PromptWithTags) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, prompt: PromptWithTags) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function PromptCard({
  prompt,
  onEdit,
  onDelete,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: PromptCardProps) {
  const { toast } = useToast();

  const handleCopy = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.body_md);
      toast({ title: 'Copied to clipboard' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to copy',
        variant: 'destructive',
      });
    }
  };

  const tags = prompt.tags ?? [];

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, prompt)}
      onDragEnd={onDragEnd}
      style={{
        border: '1px solid var(--ps-hairline)',
        background: 'var(--ps-bg-elev)',
        borderRadius: 10,
        padding: 16,
        cursor: draggable ? 'grab' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 180,
        opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 120ms, box-shadow 120ms',
        position: 'relative',
      }}
      className="group"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--ps-shadow-md)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'oklch(from var(--ps-hairline) calc(l - 0.07) c h)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ps-hairline)';
      }}
    >
      {/* Card head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
          {draggable && (
            <GripVertical
              style={{ width: 14, height: 14, color: 'var(--ps-fg-dim)', marginTop: 2, flexShrink: 0 }}
            />
          )}
          <Link
            to={`/app/p/${prompt.id}`}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ps-fg)',
              letterSpacing: '-0.005em',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {prompt.title || 'Untitled'}
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {prompt.visibility === 'public' && (
            <Globe
              style={{ width: 14, height: 14, color: 'var(--ps-accent)', marginTop: 3 }}
              aria-label="Public"
            />
          )}
          <button
            onClick={handleCopy}
            title="Copy prompt"
            style={{
              appearance: 'none',
              border: 0,
              background: 'transparent',
              color: 'var(--ps-fg-dim)',
              cursor: 'pointer',
              width: 26,
              height: 26,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 120ms, background 120ms',
            }}
            className="group-hover:opacity-100 focus:opacity-100"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ps-bg-sunken)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Copy style={{ width: 14, height: 14 }} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  appearance: 'none',
                  border: 0,
                  background: 'transparent',
                  color: 'var(--ps-fg-dim)',
                  cursor: 'pointer',
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Prompt actions"
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ps-bg-sunken)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MoreHorizontal style={{ width: 14, height: 14 }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(prompt)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(prompt)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card body: monospace preview */}
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--ps-fg-faint)',
          lineHeight: 1.55,
          flex: 1,
          fontFamily: '"JetBrains Mono", monospace',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {prompt.body_md}
      </div>

      {/* Card footer */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--ps-fg-faint)',
        }}
      >
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                style={{
                  fontSize: 11,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'var(--ps-bg-sunken)',
                  color: 'var(--ps-fg-muted)',
                  border: '1px solid var(--ps-hairline-soft)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {new Date(prompt.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
