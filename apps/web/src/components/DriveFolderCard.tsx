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
  onDropMove
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const menuItems: MenuItemProps[] = [
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
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
      className={`group relative flex items-center justify-between h-12 px-3.5 rounded-card select-none transition-all duration-150 cursor-pointer border ${
        isDragOver
          ? 'bg-selected/50 border-accent ring-2 ring-accent'
          : isSelected
          ? 'bg-selected text-text-on-selected border-transparent'
          : 'bg-card text-text-primary border-transparent hover:bg-hover'
      }`}
    >
      {/* Left: Folder Icon & Name */}
      <div className="flex items-center gap-3 overflow-hidden mr-2">
        <Icon
          name="folder"
          size={22}
          className={
            isSelected
              ? 'text-text-on-selected'
              : 'text-[#5F6368] dark:text-[#9AA0A6] shrink-0'
          }
        />
        <span className="text-sm font-medium truncate tracking-tight">{folder.name}</span>
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
        className={`p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10 transition-opacity ${
          isMenuOpen || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
