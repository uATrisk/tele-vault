import React, { useState, useRef } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { Menu, MenuItemProps } from './ui/Menu';

interface DriveFolderCardProps {
  folder: ItemManifest;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onRename: () => void;
  onMoveTo: () => void;
  onTrash: () => void;
  onToggleStar: () => void;
  onDropMove?: (droppedItemIds: string[]) => void;
  isTrashView?: boolean;
  onRestore?: () => void;
  onDeleteForever?: () => void;
}

export const DriveFolderCard: React.FC<DriveFolderCardProps> = ({
  folder,
  isSelected,
  onSelect,
  onOpen,
  onRename,
  onMoveTo,
  onTrash,
  onToggleStar,
  onDropMove,
  isTrashView,
  onRestore,
  onDeleteForever
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const isTrashed = !!(folder.trashed || isTrashView);

  const menuItems: MenuItemProps[] = isTrashed
    ? [
        ...(onRestore
          ? [
              {
                label: 'Restore from trash',
                icon: 'restore_from_trash' as const,
                onClick: onRestore
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
        { label: 'Open', icon: 'folder_open', onClick: onOpen },
        { label: 'Rename', icon: 'edit', onClick: onRename },
        { label: 'Move to', icon: 'drive_file_move', onClick: onMoveTo },
        {
          label: folder.starred || folder.favorite ? 'Remove from starred' : 'Add to starred',
          icon: folder.starred || folder.favorite ? 'star_filled' : 'star',
          onClick: onToggleStar,
          dividerAbove: true
        },
        { label: 'Move to trash', icon: 'trash', danger: true, onClick: onTrash, dividerAbove: true }
      ];

  const handleClick = (e: React.MouseEvent) => {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
    if (isTouch && !isSelected && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      onOpen();
    } else {
      onSelect(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(e);
        setIsMenuOpen(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed.itemIds)) {
              onDropMove?.(parsed.itemIds);
            }
          } catch {}
        }
      }}
      className={`group relative flex items-center justify-between h-12 px-3.5 rounded-xl select-none transition-all duration-150 cursor-pointer border active:scale-[0.985] ${
        isDragOver
          ? 'bg-accent/15 border-accent ring-2 ring-accent'
          : isSelected
          ? 'bg-[#C2E7FF] dark:bg-[#004A77] text-[#001D35] dark:text-[#C2E7FF] border-[#0B57D0]/40 dark:border-[#A8C7FA]/40 ring-1 ring-[#0B57D0] dark:ring-[#A8C7FA]'
          : 'bg-[#F0F4F9] dark:bg-[#1E1F20] text-text-primary border-transparent hover:bg-[#E9EEF6] dark:hover:bg-[#282A2C]'
      }`}
    >
      {/* Left: Folder Icon & Name */}
      <div className="flex items-center gap-3 overflow-hidden mr-2">
        <Icon
          name="folder"
          size={20}
          className={
            isSelected
              ? 'text-[#0B57D0] dark:text-[#A8C7FA]'
              : 'text-[#444746] dark:text-[#C4C7C5] shrink-0'
          }
        />
        <span
          className={`text-[13px] font-medium truncate tracking-tight ${
            isSelected ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
          }`}
        >
          {folder.name}
        </span>
        {(folder.starred || folder.favorite) && (
          <Icon name="star_filled" size={14} className="text-amber-500 shrink-0" />
        )}
      </div>

      {/* Right: Hover ⋮ Menu Button */}
      <button
        ref={menuBtnRef}
        type="button"
        aria-label="Folder options"
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

      {/* Context Menu */}
      {isMenuOpen && menuBtnRef.current && (
        <Menu
          items={menuItems}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          anchorPoint={{
            x: menuBtnRef.current.getBoundingClientRect().right - 180,
            y: menuBtnRef.current.getBoundingClientRect().bottom + 4
          }}
        />
      )}
    </div>
  );
};
