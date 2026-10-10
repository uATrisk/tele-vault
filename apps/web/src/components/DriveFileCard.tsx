import React, { useState, useRef, useEffect } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { Checkbox } from './ui/Checkbox';
import { Menu, MenuItemProps } from './ui/Menu';
import { getFileTypeMeta } from '../utils/fileType';
import { api } from '../api';
import { hexToBytes } from '@televault/crypto';
import { thumbnailQueue } from '../utils/thumbnailQueue';
import { truncateMiddle } from '../lib/utils';

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
  isTrashView?: boolean;
  onRestore?: () => void;
  onDeleteForever?: () => void;
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
  onOpenDetails,
  isTrashView,
  onRestore,
  onDeleteForever
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const meta = getFileTypeMeta(item.mime, item.kind, item.name);

  const blurPlaceholder = React.useMemo(() => {
    return meta.previewable ? thumbnailQueue.getBlurPlaceholder(item.id, item.thumbHash) : null;
  }, [item.id, item.thumbHash, meta.previewable]);

  // Decrypt thumbnail if available via prioritized background queue
  useEffect(() => {
    if (!thumbKey || !meta.previewable) return;
    const cancel = thumbnailQueue.request(
      item.id,
      async () => {
        const thumbs = await api.getThumbs([item.id]);
        return thumbs[item.id] ? hexToBytes(thumbs[item.id]) : null;
      },
      thumbKey,
      (url) => setThumbUrl(url)
    );
    return cancel;
  }, [item.id, thumbKey, meta.previewable]);

  const isTrashed = !!(item.trashed || isTrashView);

  const menuItems: MenuItemProps[] = isTrashed
    ? [
        { label: 'Preview', icon: 'image', onClick: onOpen },
        { label: 'Download', icon: 'download', onClick: onDownload },
        { label: 'Details', icon: 'info', onClick: onOpenDetails },
        ...(onRestore
          ? [
              {
                label: 'Restore from trash',
                icon: 'restore_from_trash' as const,
                onClick: onRestore,
                dividerAbove: true
              }
            ]
          : []),
        ...(onDeleteForever
          ? [
              {
                label: 'Delete permanently',
                icon: 'delete_forever' as const,
                danger: true,
                onClick: onDeleteForever,
                dividerAbove: !onRestore
              }
            ]
          : [])
      ]
    : [
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
      {/* 1. Main Preview Area - Google Drive Canvas */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="relative w-full aspect-[16/10] bg-[#F8FAFD] dark:bg-[#131314] rounded-xl overflow-hidden flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer mb-2.5"
      >
        {/* Checkbox: absolute top-2 left-2 */}
        <div
          className={`absolute top-2 left-2 z-10 transition-all duration-150 ${
            isSelected ? 'opacity-100 scale-100' : 'opacity-0 sm:group-hover:opacity-100 scale-90 sm:group-hover:scale-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => onSelect({} as any)}
            ariaLabel={`Select ${item.name}`}
          />
        </div>

        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : blurPlaceholder ? (
          <img
            src={blurPlaceholder}
            alt={item.name}
            aria-hidden="true"
            className="w-full h-full object-cover filter blur-[2px] scale-105 opacity-80"
          />
        ) : meta.previewable ? (
          <div className="flex flex-col items-center justify-center p-3 w-full h-full bg-surface/50 animate-pulse">
            <Icon name={meta.icon} size={28} className={`${meta.color} opacity-40`} />
          </div>
        ) : (
          /* Realistic Document Preview Sheet */
          <div className="flex flex-col items-center justify-center p-3 w-full h-full">
            <div className="w-16 h-20 bg-white dark:bg-[#202124] rounded-lg shadow-sm border border-divider/60 flex flex-col items-center justify-center gap-1.5 p-2 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow">
              <Icon name={meta.icon} size={26} className={meta.color} />
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

      {/* 2. File Name Row (Below Preview) */}
      <div className="flex items-center justify-between h-7 gap-1.5 min-w-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {/* File Type Icon */}
          <Icon name={meta.icon} size={18} className={`${meta.color} shrink-0`} />

          {/* File Name */}
          <span
            title={item.name}
            className={`text-[13px] font-medium truncate tracking-tight ${
              isSelected ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-text-primary'
            }`}
          >
            {truncateMiddle(item.name, 28)}
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
