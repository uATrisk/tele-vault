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

  const handleClick = (e: React.MouseEvent) => {
    // If clicking checkbox, more menu, or an interactive child, let their handler execute
    if ((e.target as HTMLElement).closest('button, input, [role="checkbox"]')) {
      return;
    }
    // If holding modifier keys, toggle selection
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      onSelect(e);
      return;
    }
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ itemIds: [item.id] }));
      }}
      onClick={handleClick}
      onDoubleClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(e);
        setIsMenuOpen(true);
      }}
      className={`group relative flex flex-col p-3 rounded-2xl select-none cursor-pointer border transition-all duration-200 ease-out ${
        isSelected
          ? 'bg-[#C2E7FF] dark:bg-[#004A77]/40 border-[#0B57D0]/40 dark:border-[#A8C7FA]/40 ring-1 ring-[#0B57D0] dark:ring-[#A8C7FA]'
          : 'bg-[#F0F4F9] dark:bg-[#1E1F20] border-transparent hover:bg-[#E9EEF6] dark:hover:bg-[#282A2C] hover:shadow-sm'
      }`}
    >
      {/* 1. Top Header Row: File Icon / Checkbox, Name, Star, and ⋮ Menu */}
      <div className="flex items-center justify-between h-7 mb-2 gap-1.5 min-w-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {/* Checkbox: visible on mobile or when selected/hovered */}
          <div
            className={`transition-opacity duration-150 shrink-0 ${
              isSelected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => onSelect({} as any)}
              ariaLabel={`Select ${item.name}`}
            />
          </div>

          {/* File Type Icon */}
          <Icon name={meta.icon} size={18} className={`${meta.color} shrink-0`} />

          {/* File Name */}
          <span
            title={item.name}
            className={`text-[13px] font-medium truncate tracking-tight ${
              isSelected ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-text-primary'
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
          className={`p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-opacity shrink-0 ${
            isMenuOpen || isSelected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <Icon name="more_vert" size={18} />
        </button>
      </div>

      {/* 2. Main Preview Area - Google Drive Canvas */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="relative w-full aspect-[16/10] bg-white dark:bg-[#131314] rounded-xl overflow-hidden flex items-center justify-center border border-black/[0.04] dark:border-white/[0.04] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)] cursor-pointer"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          /* Realistic Document Preview Sheet */
          <div className="flex flex-col items-center justify-center p-3 w-full h-full">
            <div className="w-16 h-20 bg-surface rounded shadow-sm border border-divider/40 flex flex-col items-center justify-center gap-1.5 p-2 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow">
              <Icon name={meta.icon} size={28} className={meta.color} />
              <div className="w-8 h-1 bg-divider/60 rounded-full" />
              <div className="w-5 h-1 bg-divider/40 rounded-full" />
            </div>
          </div>
        )}

        {/* Video duration badge */}
        {meta.category === 'video' && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-[2px] text-white text-[10px] font-mono shadow-sm">
            <Icon name="play_arrow" size={12} />
            {item.durationMs
              ? `${Math.floor(item.durationMs / 60000)}:${Math.floor((item.durationMs % 60000) / 1000).toString().padStart(2, '0')}`
              : 'Video'}
          </div>
        )}
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
