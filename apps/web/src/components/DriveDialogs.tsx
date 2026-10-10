import React, { useState, useEffect, useRef } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { isInvalidMoveTarget, getFolderContents } from '../utils/folderTree';

// --- 1. Rename Dialog ---
interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemManifest | null;
  onRename: (newName: string) => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  onClose,
  item,
  onRename
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name);
      setTimeout(() => {
        if (!inputRef.current) return;
        inputRef.current.focus();
        // Select name without extension
        const dotIndex = item.name.lastIndexOf('.');
        if (dotIndex > 0 && item.kind !== 'folder') {
          inputRef.current.setSelectionRange(0, dotIndex);
        } else {
          inputRef.current.select();
        }
      }, 50);
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Rename"
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>
            OK
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-11 px-3.5 rounded-lg bg-surface text-text-primary border border-divider focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none text-sm"
        />
      </form>
    </Dialog>
  );
};

// --- 2. New Folder Dialog ---
interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => void;
}

export const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  isOpen,
  onClose,
  onCreateFolder
}) => {
  const [folderName, setFolderName] = useState('Untitled folder');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('Untitled folder');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="New folder"
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!folderName.trim()}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Folder name"
          className="w-full h-11 px-3.5 rounded-lg bg-surface text-text-primary border border-divider focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none text-sm"
        />
      </form>
    </Dialog>
  );
};

// --- 3. Move To Dialog ---
interface MoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemsToMove: ItemManifest[];
  allItems: ItemManifest[];
  onMoveConfirm: (targetFolderId: string | null) => void;
  onCreateFolderInTarget: (name: string, parentId: string | null) => Promise<string | null>;
}

export const MoveDialog: React.FC<MoveDialogProps> = ({
  isOpen,
  onClose,
  itemsToMove,
  allItems,
  onMoveConfirm,
  onCreateFolderInTarget
}) => {
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('Untitled folder');

  const contents = getFolderContents(allItems, browseFolderId);
  const currentBrowseFolder = allItems.find((i) => i.id === browseFolderId);

  // Check if current browsing folder is invalid for any moving item
  const hasInvalidItem = itemsToMove.some(
    (i) => i.kind === 'folder' && isInvalidMoveTarget(allItems, i.id, browseFolderId)
  );

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName.trim()) return;
    const newId = await onCreateFolderInTarget(newSubfolderName.trim(), browseFolderId);
    if (newId) {
      setBrowseFolderId(newId);
      setIsCreatingSubfolder(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move ${itemsToMove.length} item(s)`}
      maxWidth="md"
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={hasInvalidItem}
            onClick={() => {
              onMoveConfirm(browseFolderId);
              onClose();
            }}
          >
            Move here
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-card text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setBrowseFolderId(null)}
            className="hover:underline text-text-primary"
          >
            My Drive
          </button>
          {browseFolderId && (
            <>
              <Icon name="chevron_right" size={14} className="text-text-secondary" />
              <span className="truncate text-text-primary font-semibold">
                {currentBrowseFolder?.name || 'Folder'}
              </span>
            </>
          )}
        </div>

        {/* Folder List Picker */}
        <div className="h-56 overflow-y-auto border border-divider/40 rounded-xl divide-y divide-divider/20 text-sm">
          {browseFolderId && (
            <button
              type="button"
              onClick={() => setBrowseFolderId(currentBrowseFolder?.parentId ?? null)}
              className="flex items-center gap-3 w-full p-2.5 hover:bg-hover text-text-secondary text-left font-medium"
            >
              <Icon name="arrow_back" size={18} />
              <span>Back</span>
            </button>
          )}

          {contents.folders.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No folders inside this location
            </div>
          ) : (
            contents.folders.map((folder) => {
              const isDisabled = itemsToMove.some(
                (m) => m.kind === 'folder' && isInvalidMoveTarget(allItems, m.id, folder.id)
              );

              return (
                <button
                  key={folder.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setBrowseFolderId(folder.id)}
                  className={`flex items-center justify-between w-full p-3 text-left transition-colors ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-card'
                      : 'hover:bg-hover text-text-primary cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon name="folder" size={20} className="text-[#5F6368] dark:text-[#9AA0A6]" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <Icon name="chevron_right" size={16} className="text-text-secondary" />
                </button>
              );
            })
          )}
        </div>

        {/* Inline New Folder creation */}
        {isCreatingSubfolder ? (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg bg-surface border border-divider text-sm"
              autoFocus
            />
            <Button size="sm" variant="tonal" onClick={handleCreateSubfolder}>
              Create
            </Button>
            <Button size="sm" variant="text" onClick={() => setIsCreatingSubfolder(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="text"
            icon={<Icon name="add" size={16} />}
            onClick={() => {
              setNewSubfolderName('Untitled folder');
              setIsCreatingSubfolder(true);
            }}
          >
            New folder
          </Button>
        )}
      </div>
    </Dialog>
  );
};

// --- 4. Confirm Empty Trash / Delete Forever Dialog ---
interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  isEmptyTrash?: boolean;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
  deleteProgress?: { current: number; total: number } | null;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  count,
  isEmptyTrash = false,
  onConfirm,
  isDeleting = false,
  deleteProgress = null
}) => {
  const current = deleteProgress?.current ?? 0;
  const total = deleteProgress?.total ?? Math.max(1, count);
  const pct = Math.round((current / total) * 100);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title={isEmptyTrash ? 'Empty trash?' : 'Delete forever?'}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={isDeleting}
            onClick={() => onConfirm()}
          >
            {isDeleting ? `Deleting (${current}/${total})...` : 'Delete forever'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-text-secondary">
        <p>
          {isEmptyTrash
            ? 'All items in trash will be permanently deleted.'
            : `${count} item(s) will be permanently deleted.`}
        </p>
        <p className="text-xs text-danger font-medium">
          Encrypted chunks will be permanently purged from your private Telegram storage. This action cannot be undone.
        </p>

        {isDeleting && (
          <div className="pt-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5 font-medium">
              <span>Purging encrypted files...</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2 bg-divider rounded-full overflow-hidden">
              <div
                className="h-full bg-danger transition-all duration-200"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
            <p className="text-center text-xs text-text-secondary mt-2">
              Deleting {current} of {total} items from Telegram...
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
};
