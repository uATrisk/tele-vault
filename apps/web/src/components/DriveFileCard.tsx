import React, { useState, useRef, useEffect } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { Checkbox } from './ui/Checkbox';
import { Menu, MenuItemProps } from './ui/Menu';
import { getFileTypeMeta } from '../utils/fileType';
import { api } from '../api';
import { decryptThumbnail, hexToBytes } from '@televault/crypto';

interface DriveFileCardProps {
  item: ItemManifest;
  thumbKey: CryptoKey | null;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onDownload: () => void;
  onRename: () => void;
  onMoveTo: () => void;
  onTrash: () => void;
  onToggleStar: () => void;
  onOpenDetails: () => void;
}

export const DriveFileCard: React.FC<DriveFileCardProps> = ({
  item,
  thumbKey,
  isSelected,
  onSelect,
  onOpen,
  onDownload,
  onRename,
  onMoveTo,
  onTrash,
  onToggleStar,
  onOpenDetails
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const meta = getFileTypeMeta(item.mime, item.kind, item.name);

  // Decrypt thumbnail if available
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadThumb() {
      if (!thumbKey || !meta.previewable) return;
      try {
        const thumbs = await api.getThumbs([item.id]);
        if (!thumbs[item.id] || !active) return;

        const cipherBytes = hexToBytes(thumbs[item.id]);
        const plainBytes = await decryptThumbnail(thumbKey, hexToBytes(item.id), cipherBytes);
        const blob = new Blob([plainBytes as BlobPart], { type: 'image/webp' });
        createdUrl = URL.createObjectURL(blob);
        if (active) setThumbUrl(createdUrl);
      } catch {}
    }

    loadThumb();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [item.id, thumbKey, meta.previewable]);

  const menuItems: MenuItemProps[] = [
    { label: 'Preview', icon: 'image', onClick: onOpen },
    { label: 'Download', icon: 'download', onClick: onDownload },
    { label: 'Rename', icon: 'edit', shortcut: 'F2', onClick: onRename },
    { label: 'Move to', icon: 'drive_file_move', onClick: onMoveTo },
    {
      label: item.starred || item.favorite ? 'Remove from starred' : 'Add to starred',
      icon: item.starred || item.favorite ? 'star_filled' : 'star',
      onClick: onToggleStar,
      dividerAbove: true
    },
    { label: 'Details', icon: 'info', onClick: onOpenDetails },
    { label: 'Move to trash', icon: 'trash', danger: true, onClick: onTrash, dividerAbove: true }
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ itemIds: [item.id] }));
      }}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(e);
        setIsMenuOpen(true);
      }}
      className={`group relative flex flex-col p-2 rounded-card select-none overflow-hidden cursor-pointer border transition-all duration-150 ${
        isSelected
          ? 'bg-selected border-accent/40 ring-1 ring-accent'
          : 'bg-card border-transparent hover:bg-hover'
      }`}
    >
      {/* Top Checkbox Overlay */}
      <div
        className={`absolute top-3.5 left-3.5 z-10 transition-opacity duration-150 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect({} as any)}
          ariaLabel={`Select ${item.name}`}
        />
      </div>

      {/* Thumbnail Area - perfectly centered inside padded card */}
      <div className="relative w-full aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden rounded-xl">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <Icon name={meta.icon} size={48} className={meta.color} />
          </div>
        )}

        {/* Video duration badge */}
        {meta.category === 'video' && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[11px] font-mono">
            <Icon name="play_arrow" size={12} />
            {item.durationMs
              ? `${Math.floor(item.durationMs / 60000)}:${Math.floor((item.durationMs % 60000) / 1000).toString().padStart(2, '0')}`
              : 'Video'}
          </div>
        )}
      </div>

      {/* Footer 44px */}
      <div className="flex items-center justify-between h-11 px-1.5 pt-1 gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <Icon name={meta.icon} size={18} className={meta.color} />
          <span
            className={`text-sm font-medium truncate ${
              isSelected ? 'text-text-on-selected' : 'text-text-primary'
            }`}
          >
            {item.name}
          </span>
          {(item.starred || item.favorite) && (
            <Icon name="star_filled" size={14} className="text-amber-500 shrink-0" />
          )}
        </div>

        {/* Hover ⋮ Menu Button */}
        <button
          ref={menuBtnRef}
          type="button"
          aria-label="File options"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(true);
          }}
          className={`p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-opacity ${
            isMenuOpen || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Icon name="more_vert" size={18} />
        </button>
      </div>

      {/* Context Menu */}
      {isMenuOpen && menuBtnRef.current && (
        <Menu
          items={menuItems}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          anchorPoint={{
            x: menuBtnRef.current.getBoundingClientRect().right - 200,
            y: menuBtnRef.current.getBoundingClientRect().bottom + 4
          }}
        />
      )}
    </div>
  );
};
