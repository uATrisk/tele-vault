import React, { useState, useRef } from 'react';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Menu, MenuItemProps } from './ui/Menu';

interface DriveSelectionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDownload: () => void;
  onMoveTo: () => void;
  isStarred: boolean;
  onToggleStar: () => void;
  onTrash: () => void;
  onRestore?: () => void;
  onDeleteForever?: () => void;
  isTrashView?: boolean;
  // Overflow items
  onRename?: () => void;
  onOpenDetails: () => void;
}

export const DriveSelectionToolbar: React.FC<DriveSelectionToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onDownload,
  onMoveTo,
  isStarred,
  onToggleStar,
  onTrash,
  onRestore,
  onDeleteForever,
  isTrashView = false,
  onRename,
  onOpenDetails
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowBtnRef = useRef<HTMLButtonElement>(null);

  const overflowItems: MenuItemProps[] = [
    ...(onRename && selectedCount === 1
      ? [{ label: 'Rename', icon: 'edit' as const, onClick: onRename }]
      : []),
    { label: 'File details', icon: 'info' as const, onClick: onOpenDetails }
  ];

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-selected text-text-on-selected rounded-t-panel select-none shrink-0 transition-all duration-150 border-b border-divider/20">
      {/* Left: Close selection & count */}
      <div className="flex items-center gap-3">
        <Tooltip text="Clear selection (Esc)">
          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClearSelection}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </Tooltip>
        <span className="text-sm font-medium tracking-tight">
          {selectedCount} selected
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 text-text-on-selected">
        {isTrashView ? (
          <>
            {onRestore && (
              <Tooltip text="Restore">
                <IconButton aria-label="Restore" onClick={onRestore}>
                  <Icon name="restore" size={20} />
                </IconButton>
              </Tooltip>
            )}
            {onDeleteForever && (
              <Tooltip text="Delete forever" align="right">
                <IconButton aria-label="Delete forever" onClick={onDeleteForever}>
                  <Icon name="delete_forever" size={20} />
                </IconButton>
              </Tooltip>
            )}
          </>
        ) : (
          <>
            <Tooltip text="Download">
              <IconButton aria-label="Download" onClick={onDownload}>
                <Icon name="download" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="Move to">
              <IconButton aria-label="Move to" onClick={onMoveTo}>
                <Icon name="drive_file_move" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text={isStarred ? 'Remove from starred' : 'Add to starred'}>
              <IconButton aria-label="Star" onClick={onToggleStar}>
                <Icon name={isStarred ? 'star_filled' : 'star'} size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="Move to trash" align="right">
              <IconButton aria-label="Move to trash" onClick={onTrash}>
                <Icon name="trash" size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip text="More actions" align="right">
              <button
                ref={overflowBtnRef}
                type="button"
                aria-label="More selection actions"
                onClick={() => setIsOverflowOpen(true)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <Icon name="more_vert" size={20} />
              </button>
            </Tooltip>
          </>
        )}

        {isOverflowOpen && overflowBtnRef.current && (
          <Menu
            items={overflowItems}
            isOpen={isOverflowOpen}
            onClose={() => setIsOverflowOpen(false)}
            anchorPoint={{
              x: overflowBtnRef.current.getBoundingClientRect().right - 200,
              y: overflowBtnRef.current.getBoundingClientRect().bottom + 4
            }}
          />
        )}
      </div>
    </div>
  );
};
