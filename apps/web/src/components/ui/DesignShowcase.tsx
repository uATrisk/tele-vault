import React, { useState } from 'react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { ThemeSwitch } from './ThemeSwitch';
import { Skeleton, FileCardSkeleton, FileRowSkeleton } from './Skeleton';
import { Icon } from './Icon';
import { Chip } from './Chip';
import { Toaster, toast } from './Toaster';
import { Dialog } from './Dialog';
import {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from './AlertDialog';

export const DesignShowcase: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <div className="min-h-screen bg-page text-text-primary p-8 max-w-5xl mx-auto space-y-12">
      <header className="border-b border-divider/40 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TeleVault Design System Showcase</h1>
          <p className="text-sm text-text-secondary mt-1">
            Dev-only interactive audit of all UI primitives, states, and motion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitch
            isDark={isDark}
            onToggle={() => {
              setIsDark(!isDark);
              document.documentElement.classList.toggle('dark', !isDark);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => (window.location.hash = '#/drive')}>
            Back to Drive
          </Button>
        </div>
      </header>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Buttons (All States & Sizes)</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="md">Primary</Button>
          <Button variant="tonal" size="md">Tonal</Button>
          <Button variant="text" size="md">Text</Button>
          <Button variant="danger" size="md">Danger</Button>
          <Button variant="outline" size="md">Outline</Button>
          <Button
            variant="primary"
            size="md"
            loading={loadingBtn}
            onClick={() => {
              setLoadingBtn(true);
              setTimeout(() => setLoadingBtn(false), 2000);
            }}
          >
            {loadingBtn ? 'Loading...' : 'Click to Load'}
          </Button>
          <Button variant="primary" size="md" disabled>Disabled</Button>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </section>

      {/* Tooltips */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Tooltips & Shortcuts</h2>
        <div className="flex items-center gap-6">
          <Tooltip text="Create new folder" shortcut="Shift+N">
            <Button variant="tonal" size="sm">Hover for Shortcut</Button>
          </Tooltip>
          <Tooltip text="Search across entire vault" shortcut="Ctrl+K">
            <Button variant="outline" size="sm">Search Command</Button>
          </Tooltip>
        </div>
      </section>

      {/* Chips */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Filter Chips</h2>
        <div className="flex items-center gap-3">
          <Chip label="All files" active onClick={() => {}} />
          <Chip label="Photos & images" onClick={() => {}} />
          <Chip label="Documents" onClick={() => {}} />
          <Chip label="PDFs" onClick={() => {}} />
        </div>
      </section>

      {/* Toasts */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Toasts & Undo Actions</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="tonal"
            onClick={() =>
              toast('File moved to trash', {
                description: 'Expires in 30 days',
                action: {
                  label: 'Undo',
                  onClick: () => toast.success('Restored file')
                }
              })
            }
          >
            Trigger Undo Toast
          </Button>
          <Button
            variant="tonal"
            onClick={() => toast.success('12 files uploaded successfully')}
          >
            Trigger Success Toast
          </Button>
        </div>
      </section>

      {/* Dialogs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Dialogs & Confirmations</h2>
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
            Open Standard Dialog
          </Button>
          <AlertDialogRoot>
            <AlertDialogTrigger asChild>
              <Button variant="danger">Open Destructive Alert</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Permanently delete files?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All encrypted chunks will be permanently removed
                from Telegram and this device.
              </AlertDialogDescription>
              <div className="flex items-center justify-end gap-3 pt-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction destructive onClick={() => toast.error('Deleted permanently')}>
                  Delete Forever
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialogRoot>
        </div>

        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Create New Folder"
          actions={
            <>
              <Button variant="text" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { setIsDialogOpen(false); toast.success('Folder created'); }}>Create</Button>
            </>
          }
        >
          <p>Organize your encrypted media into a new folder.</p>
        </Dialog>
      </section>

      {/* Skeletons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Content-Shaped Shimmer Skeletons</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FileCardSkeleton />
          <FileCardSkeleton />
          <FileCardSkeleton />
          <FileCardSkeleton />
        </div>
        <div className="space-y-2 mt-4">
          <FileRowSkeleton />
          <FileRowSkeleton />
        </div>
      </section>

      <Toaster />
    </div>
  );
};
