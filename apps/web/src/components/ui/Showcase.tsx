import React, { useState } from 'react';
import { Icon, IconName } from './Icon';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Chip } from './Chip';
import { Checkbox } from './Checkbox';
import { Menu, MenuItemProps } from './Menu';
import { Dialog } from './Dialog';
import { Snackbar } from './Snackbar';
import { Tooltip } from './Tooltip';

export const Showcase: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [checkboxVal, setCheckboxVal] = useState(false);
  const [chipActive, setChipActive] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.setAttribute('data-theme', next);
  };

  const sampleMenuItems: MenuItemProps[] = [
    { label: 'Preview', icon: 'image' },
    { label: 'Download', icon: 'download' },
    { label: 'Rename', icon: 'edit', shortcut: 'F2' },
    { label: 'Move to', icon: 'drive_file_move' },
    { label: 'Add to starred', icon: 'star', dividerAbove: true },
    { label: 'Move to trash', icon: 'trash', danger: true, dividerAbove: true }
  ];

  const iconNames: IconName[] = [
    'folder',
    'folder_open',
    'file',
    'image',
    'video',
    'audio',
    'pdf',
    'doc',
    'archive',
    'search',
    'tune',
    'settings',
    'lock',
    'add',
    'grid_view',
    'list_view',
    'info',
    'star',
    'trash',
    'download',
    'drive_file_move',
    'edit',
    'more_vert',
    'zoom_in',
    'shield',
    'cloud'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-page text-text-primary overflow-y-auto p-8 space-y-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-divider">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Design System Showcase</h1>
            <p className="text-sm text-text-secondary">Google Drive aesthetic tokens, typography, and primitives</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="tonal" onClick={toggleTheme}>
              Toggle Theme ({theme})
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close Showcase
            </Button>
          </div>
        </div>

        {/* Buttons */}
        <section className="bg-surface rounded-panel p-6 border border-divider/40 space-y-4">
          <h2 className="text-lg font-medium">Buttons & Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Icon name="add" size={18} />}>
              Primary Button
            </Button>
            <Button variant="tonal" icon={<Icon name="download" size={18} />}>
              Tonal Secondary
            </Button>
            <Button variant="text" icon={<Icon name="star" size={18} />}>
              Text Action
            </Button>
            <Button variant="danger" icon={<Icon name="trash" size={18} />}>
              Destructive
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* IconButtons & Tooltips */}
        <section className="bg-surface rounded-panel p-6 border border-divider/40 space-y-4">
          <h2 className="text-lg font-medium">Icon Buttons</h2>
          <div className="flex items-center gap-3">
            <Tooltip text="Settings">
              <IconButton aria-label="Settings">
                <Icon name="settings" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="List view">
              <IconButton active aria-label="List view">
                <Icon name="list_view" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="Details">
              <IconButton aria-label="Details">
                <Icon name="info" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="More options">
              <IconButton
                aria-label="More"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setIsMenuOpen(true);
                }}
              >
                <Icon name="more_vert" size={20} />
              </IconButton>
            </Tooltip>
          </div>
        </section>

        {/* Chips & Checkbox */}
        <section className="bg-surface rounded-panel p-6 border border-divider/40 space-y-4">
          <h2 className="text-lg font-medium">Chips & Selection</h2>
          <div className="flex items-center gap-4">
            <Chip
              label="Type"
              active={chipActive}
              onClick={() => setChipActive(!chipActive)}
              onClear={() => setChipActive(false)}
            />
            <Chip label="Modified" />
            <div className="flex items-center gap-2 pl-4 border-l border-divider">
              <Checkbox checked={checkboxVal} onChange={setCheckboxVal} />
              <span className="text-sm">Selectable state ({checkboxVal ? 'checked' : 'unchecked'})</span>
            </div>
          </div>
        </section>

        {/* Dialog & Snackbar Triggers */}
        <section className="bg-surface rounded-panel p-6 border border-divider/40 space-y-4">
          <h2 className="text-lg font-medium">Overlays & Feedback</h2>
          <div className="flex items-center gap-3">
            <Button variant="tonal" onClick={() => setIsDialogOpen(true)}>
              Open Dialog (28px radius)
            </Button>
            <Button variant="tonal" onClick={() => setIsSnackbarOpen(true)}>
              Trigger Snackbar (with Undo)
            </Button>
          </div>
        </section>

        {/* Icon Set */}
        <section className="bg-surface rounded-panel p-6 border border-divider/40 space-y-4">
          <h2 className="text-lg font-medium">Material Symbol Vectors</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {iconNames.map((name) => (
              <div
                key={name}
                className="flex flex-col items-center justify-center p-3 rounded-card bg-card hover:bg-hover transition-colors text-center gap-1.5"
              >
                <Icon name={name} size={24} className="text-text-primary" />
                <span className="text-[11px] text-text-secondary truncate w-full">{name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Menu instance */}
      <Menu
        items={sampleMenuItems}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        anchorPoint={{ x: window.innerWidth / 2, y: 300 }}
      />

      {/* Dialog instance */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Rename Item"
        actions={
          <>
            <Button variant="text" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
              OK
            </Button>
          </>
        }
      >
        <p>Enter a new name for the selected item.</p>
      </Dialog>

      {/* Snackbar instance */}
      <Snackbar
        message="1 item moved to trash"
        isOpen={isSnackbarOpen}
        onClose={() => setIsSnackbarOpen(false)}
        actionLabel="Undo"
        onAction={() => alert('Undo clicked')}
      />
    </div>
  );
};
