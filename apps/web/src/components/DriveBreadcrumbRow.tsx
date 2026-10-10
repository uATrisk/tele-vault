import React, { useState, useRef } from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Menu, MenuItemProps } from './ui/Menu';

interface DriveBreadcrumbRowProps {
  breadcrumbs: ItemManifest[];
  currentFolder: ItemManifest | null;
  onNavigate: (folderId: string | null) => void;
  isGridView: boolean;
  onToggleViewMode: (grid: boolean) => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  // Folder action handlers
  onNewFolder: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  onDownloadFolder?: () => void;
  onRenameFolder?: () => void;
  onTrashFolder?: () => void;
}

export const DriveBreadcrumbRow: React.FC<DriveBreadcrumbRowProps> = ({
  breadcrumbs,
  currentFolder,
  onNavigate,
  isGridView,
  onToggleViewMode,
  isDetailsOpen,
  onToggleDetails,
  onNewFolder,
  onUploadFile,
  onUploadFolder,
  onDownloadFolder,
  onRenameFolder,
  onTrashFolder
}) => {
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLButtonElement>(null);

  const folderMenuItems: MenuItemProps[] = [
    { label: 'New folder', icon: 'folder', onClick: onNewFolder },
    { label: 'File upload', icon: 'upload', dividerAbove: true, onClick: onUploadFile },
    { label: 'Folder upload', icon: 'drive_file_move', onClick: onUploadFolder },
    ...(currentFolder
      ? [
          { label: 'Download', icon: 'download' as const, dividerAbove: true, onClick: onDownloadFolder },
          { label: 'Rename', icon: 'edit' as const, onClick: onRenameFolder },
          { label: 'Move to trash', icon: 'trash' as const, danger: true, onClick: onTrashFolder }
        ]
      : [])
  ];

  return (
    <div className="flex items-center justify-between h-12 px-4 select-none shrink-0 border-b border-divider/30">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1 overflow-hidden">
        {!currentFolder ? (
          <button
            ref={dropdownRef}
            type="button"
            onClick={() => setIsFolderMenuOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xl font-normal tracking-tight text-text-primary hover:bg-hover transition-colors cursor-pointer"
          >
            <span>My Drive</span>
            <Icon name="chevron_down" size={18} className="text-text-secondary mt-0.5" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate(null)}
              className="px-2.5 py-1 rounded-lg text-sm sm:text-base font-normal text-text-secondary hover:text-text-primary hover:bg-hover transition-colors cursor-pointer shrink-0"
            >
              My Drive
            </button>

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              if (isLast) {
                return (
                  <React.Fragment key={crumb.id}>
                    <Icon name="chevron_right" size={16} className="text-text-secondary/50 shrink-0" />
                    <button
                      ref={dropdownRef}
                      type="button"
                      onClick={() => setIsFolderMenuOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xl font-normal tracking-tight text-text-primary hover:bg-hover transition-colors cursor-pointer max-w-[200px] sm:max-w-[320px] overflow-hidden"
                    >
                      <span className="truncate">{crumb.name}</span>
                      <Icon name="chevron_down" size={18} className="text-text-secondary mt-0.5 shrink-0" />
                    </button>
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={crumb.id}>
                  <Icon name="chevron_right" size={16} className="text-text-secondary/50 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.id)}
                    className="px-2 py-1 rounded-lg truncate max-w-[140px] text-sm sm:text-base font-normal text-text-secondary hover:text-text-primary hover:bg-hover transition-colors cursor-pointer shrink-0"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </>
        )}

        {isFolderMenuOpen && dropdownRef.current && (
          <Menu
            items={folderMenuItems}
            isOpen={isFolderMenuOpen}
            onClose={() => setIsFolderMenuOpen(false)}
            anchorPoint={{
              x: dropdownRef.current.getBoundingClientRect().left,
              y: dropdownRef.current.getBoundingClientRect().bottom + 4
            }}
          />
        )}
      </div>

      {/* Right Controls: Grid/List Toggle & Details Toggle */}
      <div className="flex items-center gap-1">
        {/* Segmented View Mode Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-card border border-divider/30">
          <Tooltip text="List view">
            <button
              type="button"
              aria-label="List view"
              onClick={() => onToggleViewMode(false)}
              className={`p-1.5 rounded-full transition-colors ${
                !isGridView ? 'bg-surface text-accent shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name="list_view" size={18} />
            </button>
          </Tooltip>
          <Tooltip text="Grid view">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => onToggleViewMode(true)}
              className={`p-1.5 rounded-full transition-colors ${
                isGridView ? 'bg-surface text-accent shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name="grid_view" size={18} />
            </button>
          </Tooltip>
        </div>

        {/* Details Toggle Button */}
        <Tooltip text="View details">
          <IconButton
            size="md"
            active={isDetailsOpen}
            aria-label="Toggle details panel"
            onClick={onToggleDetails}
          >
            <Icon name="info" size={20} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};
