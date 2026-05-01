import { Link } from 'react-router-dom';
import { Copy, FileText, MoreVertical, Trash2, Edit, Globe, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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

export function PromptCard({ prompt, onEdit, onDelete, draggable = false, onDragStart, onDragEnd, isDragging = false }: PromptCardProps) {
  const { toast } = useToast();
  const preview =
    prompt.body_md.length > 120 ? `${prompt.body_md.slice(0, 120).trimEnd()}...` : prompt.body_md;

  const handleCopy = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(prompt.body_md);
      toast({
        title: 'Copied',
        description: 'Prompt copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to copy prompt',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card
      className={`group hover:shadow-md transition-all ${isDragging ? 'opacity-50 cursor-grabbing' : ''} ${draggable ? 'cursor-grab' : ''}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, prompt)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-2 flex-1">
          {draggable && (
            <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground cursor-grab" />
          )}
          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <Link to={`/app/p/${prompt.id}`}>
              <h3 className="font-semibold hover:text-primary truncate">{prompt.title}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {new Date(prompt.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {prompt.visibility === 'public' && (
            <Badge className="gap-1" aria-label="Public prompt">
              <Globe className="h-3 w-3" aria-hidden="true" />
              Public
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            onClick={handleCopy}
            aria-label="Copy prompt"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Prompt actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
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
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {preview}
        </p>
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
