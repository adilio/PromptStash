import { Folder } from 'lucide-react';

interface FolderDropZoneProps {
  folderId: string | null;
  folderName: string;
  isOver: boolean;
  onDrop: (folderId: string | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function FolderDropZone({
  folderId,
  folderName,
  isOver,
  onDrop,
  onDragOver,
  onDragLeave,
}: FolderDropZoneProps) {
  return (
    <div
      className={`p-4 border-2 border-dashed rounded-lg transition-all ${
        isOver
          ? 'border-primary bg-primary/10 scale-105'
          : 'border-muted-foreground/30 hover:border-muted-foreground/50'
      }`}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(folderId);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
    >
      <div className="flex items-center gap-3">
        <Folder className={`h-5 w-5 ${isOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <p className={`font-medium ${isOver ? 'text-primary' : ''}`}>{folderName}</p>
          <p className="text-xs text-muted-foreground">
            {isOver ? 'Drop here to move' : 'Drag prompts here'}
          </p>
        </div>
      </div>
    </div>
  );
}
