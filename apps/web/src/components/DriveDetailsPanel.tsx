import React, { useState, useEffect } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { getFileTypeMeta } from '../utils/fileType';
import { formatBytes, formatDriveDate, getBreadcrumbs } from '../utils/folderTree';
import { api } from '../api';
import { decryptThumbnail, hexToBytes } from '@televault/crypto';

interface DriveDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ItemManifest[];
  currentFolder: ItemManifest | null;
  allItems: ItemManifest[];
  thumbKey: CryptoKey | null;
}

export const DriveDetailsPanel: React.FC<DriveDetailsPanelProps> = ({
  isOpen,
  onClose,
  selectedItems,
  currentFolder,
  allItems,
  thumbKey
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  // If exactly one item selected, show that; otherwise if 0, show current folder
  const activeItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const isMulti = selectedItems.length > 1;

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadThumb() {
      setThumbUrl(null);
      if (!activeItem || !thumbKey) return;
      const meta = getFileTypeMeta(activeItem.mime, activeItem.kind, activeItem.name);
      if (!meta.previewable) return;

      try {
        const thumbs = await api.getThumbs([activeItem.id]);
        if (!thumbs[activeItem.id] || !active) return;
        const cipherBytes = hexToBytes(thumbs[activeItem.id]);
        const plainBytes = await decryptThumbnail(thumbKey, hexToBytes(activeItem.id), cipherBytes);
        const blob = new Blob([plainBytes as BlobPart], { type: 'image/webp' });
        url = URL.createObjectURL(blob);
        if (active) setThumbUrl(url);
      } catch {}
    }

    loadThumb();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeItem?.id, thumbKey]);

  if (!isOpen) return null;

  return (
    <aside className="w-80 lg:w-96 h-full bg-surface border-l border-divider/40 flex flex-col shrink-0 select-none overflow-y-auto animate-in slide-in-from-right-4 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-divider/30">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-medium text-text-primary truncate">
            {isMulti
              ? `${selectedItems.length} items selected`
              : activeItem
              ? activeItem.name
              : currentFolder
              ? currentFolder.name
              : 'My Drive'}
          </span>
        </div>
        <IconButton size="sm" aria-label="Close details panel" onClick={onClose}>
          <Icon name="close" size={18} />
        </IconButton>
      </div>

      <div className="p-4 space-y-6 text-sm">
        {/* Multi-selection summary */}
        {isMulti && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-card text-center space-y-1">
              <div className="text-2xl font-bold text-text-primary">{selectedItems.length}</div>
              <div className="text-xs text-text-secondary">Selected items</div>
            </div>
            <div className="flex justify-between py-2 border-b border-divider/30 text-xs">
              <span className="text-text-secondary">Combined size</span>
              <span className="font-medium text-text-primary">
                {formatBytes(selectedItems.reduce((acc, i) => acc + i.size, 0))}
              </span>
            </div>
          </div>
        )}

        {/* Single item details */}
        {activeItem && (
          <>
            {/* Preview Area */}
            <div className="w-full aspect-video bg-card rounded-xl overflow-hidden flex items-center justify-center border border-divider/30">
              {thumbUrl ? (
                <img src={thumbUrl} alt={activeItem.name} className="w-full h-full object-cover" />
              ) : (
                <Icon
                  name={getFileTypeMeta(activeItem.mime, activeItem.kind, activeItem.name).icon}
                  size={48}
                  className={getFileTypeMeta(activeItem.mime, activeItem.kind, activeItem.name).color}
                />
              )}
            </div>

            {/* Properties List */}
            <div className="space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-text-primary">File details</h3>

              <div className="flex justify-between py-1.5 border-b border-divider/30">
                <span className="text-text-secondary">Type</span>
                <span className="font-medium text-text-primary">
                  {getFileTypeMeta(activeItem.mime, activeItem.kind, activeItem.name).label}
                </span>
              </div>

              {activeItem.kind !== 'folder' && (
                <div className="flex justify-between py-1.5 border-b border-divider/30">
                  <span className="text-text-secondary">Size</span>
                  <span className="font-medium text-text-primary">{formatBytes(activeItem.size)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-divider/30">
                <span className="text-text-secondary">Location</span>
                <span className="font-medium text-text-primary truncate max-w-[180px]">
                  {getBreadcrumbs(allItems, activeItem.parentId ?? null)
                    .map((c) => c.name)
                    .join(' / ') || 'My Drive'}
                </span>
              </div>

              {activeItem.takenAt && (
                <div className="flex justify-between py-1.5 border-b border-divider/30">
                  <span className="text-text-secondary">Created / Taken</span>
                  <span className="font-medium text-text-primary">{formatDriveDate(activeItem.takenAt)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-divider/30">
                <span className="text-text-secondary">Uploaded</span>
                <span className="font-medium text-text-primary">{formatDriveDate(activeItem.uploadedAt)}</span>
              </div>

              {activeItem.width && activeItem.height && (
                <div className="flex justify-between py-1.5 border-b border-divider/30">
                  <span className="text-text-secondary">Dimensions</span>
                  <span className="font-medium text-text-primary">
                    {activeItem.width} × {activeItem.height} px
                  </span>
                </div>
              )}

              {activeItem.durationMs && (
                <div className="flex justify-between py-1.5 border-b border-divider/30">
                  <span className="text-text-secondary">Duration</span>
                  <span className="font-medium text-text-primary">
                    {Math.floor(activeItem.durationMs / 1000)}s
                  </span>
                </div>
              )}
            </div>

            {/* Zero-Knowledge & Encryption Section */}
            <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/20 space-y-1.5">
              <div className="flex items-center gap-2 text-accent font-medium text-xs">
                <Icon name="shield" size={16} />
                <span>Private Vault Storage</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-normal">
                End-to-end encrypted with AES-256-GCM. Stored as{' '}
                <strong className="text-text-primary">
                  {activeItem.chunks?.length || 0} encrypted part(s)
                </strong>{' '}
                in Telegram.
              </p>
            </div>
          </>
        )}

        {/* Current Folder Details (when nothing selected) */}
        {!activeItem && !isMulti && (
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-text-primary">Folder details</h3>
            <div className="flex justify-between py-1.5 border-b border-divider/30">
              <span className="text-text-secondary">Location</span>
              <span className="font-medium text-text-primary">
                {currentFolder ? currentFolder.name : 'My Drive (Root)'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-divider/30 text-xs text-text-secondary space-y-1">
              <div className="font-medium text-text-primary">Folder information</div>
              <p>Select a file or folder to view its encryption parts, metadata, and preview.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
