import { useState, useCallback } from 'react';

export interface DragItem {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface DropZone {
  id: string;
  type: string;
  accepts: string[];
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverZone(null);
  }, []);

  const handleDragOver = useCallback((zoneId: string) => {
    setDragOverZone(zoneId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverZone(null);
  }, []);

  const canDrop = useCallback(
    (zone: DropZone) => {
      if (!draggedItem) return false;
      return zone.accepts.includes(draggedItem.type);
    },
    [draggedItem]
  );

  return {
    draggedItem,
    dragOverZone,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    canDrop,
  };
}
