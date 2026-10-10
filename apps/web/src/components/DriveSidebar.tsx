import React, { useState, useRef } from 'react';
import { Icon, IconName } from './ui/Icon';
import { Menu, MenuItemProps } from './ui/Menu';
import { formatBytes } from '../utils/folderTree';

export type NavRoute = 'drive' | 'photos' | 'recent' | 'starred' | 'trash';

interface DriveSidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  onNewFolder: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  usedBytes: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const DriveSidebar: React.FC<DriveSidebarProps> = ({
  currentRoute,
  onRouteChange,
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
  usedBytes,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const navItems: Array<{ route: NavRoute; label: string; icon: IconName }> = [
    { route: 'drive', label: 'My Drive', icon: 'folder' },
    { route: 'photos', label: 'Photos', icon: 'image' },
    { route: 'recent', label: 'Recent', icon: 'refresh' },
    { route: 'starred', label: 'Starred', icon: 'star' },
    { route: 'trash', label: 'Trash', icon: 'trash' }
  ];

  const newMenuItems: MenuItemProps[] = [
    {
      label: 'New folder',
      icon: 'folder',
      onClick: onNewFolder
    },
    {
      label: 'File upload',
      icon: 'upload',
      dividerAbove: true,
      onClick: onUploadFiles
    },
    {
      label: 'Folder upload',
      icon: 'drive_file_move',
      onClick: onUploadFolder
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-2 px-3 justify-between select-none">
      <div className="space-y-4">
        {/* + New Button */}
        <div className="px-1 py-1">
          <button
            ref={newButtonRef}
            type="button"
            onClick={() => setIsNewMenuOpen(true)}
            className="flex items-center gap-3 h-14 px-5 rounded-2xl bg-surface hover:bg-hover active:bg-hover text-text-primary font-medium text-sm shadow-card hover:shadow-md transition-all duration-150 border border-divider/40 md:w-auto w-full justify-center md:justify-start"
          >
            <Icon name="add" size={24} className="text-accent" />
            <span className="hidden md:inline">New</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  onRouteChange(item.route);
                  onCloseMobile?.();
                }}
                className={`flex items-center gap-4 w-full h-10 px-4 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-selected text-text-on-selected'
                    : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                }`}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  className={isActive ? 'text-text-on-selected' : 'text-text-secondary'}
                />
                <span className="truncate hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage Information */}
      <div className="pt-4 border-t border-divider/40 px-3 space-y-2">
        <div className="flex items-center gap-3 text-text-secondary">
          <Icon name="cloud" size={20} />
          <span className="text-sm font-medium hidden md:inline">Storage</span>
        </div>
        <div className="hidden md:block space-y-1.5">
          <div className="w-full h-1 bg-divider rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full w-1/4 animate-pulse" />
          </div>
          <div className="text-xs text-text-secondary font-medium">
            {formatBytes(usedBytes)} used of ∞
          </div>
          <div className="text-[11px] text-text-secondary/70 leading-tight">
            Stored in your private Telegram channel
          </div>
        </div>
      </div>

      {/* New Dropdown Menu */}
      {isNewMenuOpen && newButtonRef.current && (
        <Menu
          items={newMenuItems}
          isOpen={isNewMenuOpen}
          onClose={() => setIsNewMenuOpen(false)}
          anchorPoint={{
            x: newButtonRef.current.getBoundingClientRect().left,
            y: newButtonRef.current.getBoundingClientRect().bottom + 4
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden sm:block w-16 md:w-64 h-full bg-page shrink-0 transition-all duration-150">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 sm:hidden bg-black/40 backdrop-blur-[2px]"
          onClick={onCloseMobile}
        >
          <div
            className="w-64 h-full bg-page shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsNewMenuOpen(true)}
        aria-label="New action"
        className="fixed sm:hidden bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-surface text-accent shadow-lg border border-divider/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Icon name="add" size={28} />
      </button>
    </>
  );
};
