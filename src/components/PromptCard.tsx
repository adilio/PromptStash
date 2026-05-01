import { Link } from 'react-router-dom';
import { FileText, MoreVertical, Trash2, Edit, Globe, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Prompt } from '@/lib/types';

interface PromptCardProps {
  prompt: Prompt;
  onEdit?: (prompt: Prompt) => void;
  onDelete?: (prompt: Prompt) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, prompt: Prompt) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function PromptCard({ prompt, onEdit, onDelete, draggable = false, onDragStart, onDragEnd, isDragging = false }: PromptCardProps) {
  return (
    <Card
      className={`hover:shadow-md transition-all ${isDragging ? 'opacity-50 cursor-grabbing' : ''} ${draggable ? 'cursor-grab' : ''}`}
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
            <Badge className="gap-1">
              <Globe className="h-3 w-3" aria-hidden="true" />
              Public
            </Badge>
          )}
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
        <p className="text-sm text-muted-foreground line-clamp-2">
          {prompt.body_md.substring(0, 150)}...
        </p>
      </CardContent>
    </Card>
  );
}
