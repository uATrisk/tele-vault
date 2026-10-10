import React from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: '/', desc: 'Focus search bar' },
    { key: 'Esc', desc: 'Clear selection or close modal' },
    { key: 'Enter / Space', desc: 'Open folder or preview file' },
    { key: 'Delete / Backspace', desc: 'Move selected item(s) to trash' },
    { key: 'Ctrl / Cmd + A', desc: 'Select all items in current view' },
    { key: 'F2', desc: 'Rename selected item' },
    { key: '← / →', desc: 'Previous / next file in preview' },
    { key: '?', desc: 'Show this keyboard shortcuts dialog' }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      actions={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="space-y-3 py-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-divider/30 text-xs"
            >
              <span className="text-text-secondary">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-divider/60 font-mono font-semibold text-text-primary text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
};
