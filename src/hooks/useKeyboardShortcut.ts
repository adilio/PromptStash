import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  enabled?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 * @param options Keyboard shortcut configuration
 */
export function useKeyboardShortcut({
  key,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
  callback,
  enabled = true,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const matchesShift = shiftKey ? event.shiftKey : !event.shiftKey;

      if (matchesKey && matchesCtrl && matchesShift) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, ctrlKey, metaKey, shiftKey, callback, enabled]);
}
