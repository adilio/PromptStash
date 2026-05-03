import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortcutRow {
  keys: string[];
  action: string;
}

const shortcuts: ShortcutRow[] = [
  { keys: ['N'], action: 'New prompt' },
  { keys: ['?'], action: 'Open this help' },
  { keys: ['/'], action: 'Focus search' },
  { keys: ['⌘ K'], action: 'Command palette' },
  { keys: ['⌘ \\'], action: 'Toggle sidebar' },
  { keys: ['⌘ S'], action: 'Save prompt' },
  { keys: ['⌘ 1'], action: 'Write tab' },
  { keys: ['⌘ 2'], action: 'Preview tab' },
  { keys: ['⌘ ⇧ C'], action: 'Copy prompt body' },
  { keys: ['↑ ↓'], action: 'Navigate prompt list' },
  { keys: ['Enter'], action: 'Open focused prompt' },
  { keys: ['Esc'], action: 'Close modal / palette' },
];

function ShortcutKey({ keys }: { keys: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {keys.map((k, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
          {i > 0 && <span style={{ fontSize: 10, color: 'var(--ps-fg-faint)' }}>+</span>}
          <kbd
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              padding: '3px 6px',
              border: '1px solid var(--ps-hairline)',
              borderRadius: 4,
              background: 'var(--ps-bg-sunken)',
              color: 'var(--ps-fg)',
              whiteSpace: 'nowrap',
            }}
          >
            {k}
          </kbd>
        </span>
      ))}
    </div>
  );
}

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 16px',
            marginTop: 16,
          }}
        >
          {shortcuts.map((shortcut, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < shortcuts.length - 1 ? '1px solid var(--ps-hairline-soft)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ps-fg-muted)' }}>{shortcut.action}</span>
              <ShortcutKey keys={shortcut.keys} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
