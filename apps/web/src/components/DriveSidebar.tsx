import React, { useState, useRef } from 'react';
import { Icon, IconName } from './ui/Icon';
import { Menu, MenuItemProps } from './ui/Menu';
import { formatBytes } from '../utils/folderTree';
import { BrandLogo } from './ui/BrandLogo';
import { motion } from 'motion/react';

export type NavRoute = 'drive' | 'photos' | 'recent' | 'starred' | 'trash';

interface DriveSidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  onNewFolder: () => void;
  onUploadFiles: () => void;
  onUploadPhotos?: () => void;
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
  onUploadPhotos,
  onUploadFolder,
  usedBytes,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isMobileNewSheetOpen, setIsMobileNewSheetOpen] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const navItems: Array<{ route: NavRoute; label: string; icon: IconName }> = [
    { route: 'drive', label: 'My Drive', icon: 'folder' },
    { route: 'photos', label: 'Photos', icon: 'image' },
    { route: 'recent', label: 'Recent', icon: 'refresh' },
    { route: 'starred', label: 'Starred', icon: 'star' },
    { route: 'trash', label: 'Trash', icon: 'trash' }
  ];

  const bottomNavItems: Array<{ route: NavRoute; label: string; icon: IconName }> = [
    { route: 'drive', label: 'Files', icon: 'folder' },
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
        {/* Google Drive + New Floating Action Button (Desktop / Drawer) */}
        <div className="px-1 py-1">
          <button
            ref={newButtonRef}
            type="button"
            onClick={() => setIsNewMenuOpen(true)}
            className="flex items-center gap-3.5 h-14 px-5 rounded-2xl bg-white dark:bg-[#282A2C] hover:bg-[#F8FAFD] dark:hover:bg-[#333538] text-text-primary font-medium text-sm shadow-fab hover:shadow-fab-hover active:scale-[0.98] transition-all duration-200 cursor-pointer w-full md:w-auto lg:w-auto justify-start md:justify-center lg:justify-start"
          >
            {/* Authentic Google 4-color Plus Icon */}
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 5a2 2 0 0 1 4 0v6h-4V5z" fill="#EA4335" />
              <path d="M19 10a2 2 0 0 1 0 4h-6v-4h6z" fill="#4285F4" />
              <path d="M14 19a2 2 0 0 1-4 0v-6h4v6z" fill="#34A853" />
              <path d="M5 14a2 2 0 0 1 0-4h6v4H5z" fill="#FBBC05" />
              <path d="M10 10h4v4h-4z" fill="#4285F4" />
            </svg>
            <span className="inline md:hidden lg:inline font-medium text-[15px]">New</span>
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
                className={`relative flex items-center w-full h-10 px-4 rounded-full text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-[#001D35] dark:text-[#C2E7FF] font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-[#1F1F1F]/[0.06] dark:hover:bg-[#E3E3E3]/[0.08]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    className="absolute inset-0 rounded-full bg-[#C2E7FF] dark:bg-[#004A77]"
                  />
                )}
                <span className="relative z-10 flex items-center gap-4 w-full">
                  <Icon
                    name={item.icon}
                    size={20}
                    className={isActive ? 'text-[#001D35] dark:text-[#C2E7FF] shrink-0' : 'text-text-secondary shrink-0'}
                  />
                  <span className="truncate inline md:hidden lg:inline">{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage Information */}
      <div className="pt-4 border-t border-divider/40 px-3 space-y-2">
        <div className="flex items-center gap-3 text-text-secondary">
          <Icon name="cloud" size={20} className="shrink-0" />
          <span className="text-sm font-medium inline md:hidden lg:inline">Storage</span>
        </div>
        <div className="block md:hidden lg:block space-y-1.5">
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

      {/* Desktop / Drawer New Dropdown Menu */}
      {isNewMenuOpen && newButtonRef.current && (
        <Menu
          items={newMenuItems}
          isOpen={isNewMenuOpen}
          onClose={() => setIsNewMenuOpen(false)}
          anchorPoint={{
            x: newButtonRef.current.getBoundingClientRect().left,
            y: newButtonRef.current.getBoundingClientRect().bottom + 8
          }}
          className="w-[210px]"
        />
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop / Tablet Rail Sidebar */}
      <aside className="hidden md:block w-16 lg:w-64 h-full bg-page shrink-0 transition-all duration-150">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-page shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider/30">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={28} />
                <span className="text-lg font-medium tracking-tight text-text-primary">TeleVault</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-hover active:bg-hover"
                aria-label="Close menu"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile Floating Action Button (FAB) - Positioned comfortably above Bottom Bar */}
      <button
        type="button"
        onClick={() => setIsMobileNewSheetOpen(true)}
        aria-label="Create or upload"
        className="fixed md:hidden bottom-20 right-4 z-40 w-14 h-14 rounded-2xl bg-white dark:bg-[#282A2C] text-text-primary shadow-fab hover:shadow-fab-hover active:scale-95 transition-all duration-150 flex items-center justify-center border border-divider/40 cursor-pointer"
      >
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10 5a2 2 0 0 1 4 0v6h-4V5z" fill="#EA4335" />
          <path d="M19 10a2 2 0 0 1 0 4h-6v-4h6z" fill="#4285F4" />
          <path d="M14 19a2 2 0 0 1-4 0v-6h4v6z" fill="#34A853" />
          <path d="M5 14a2 2 0 0 1 0-4h6v4H5z" fill="#FBBC05" />
          <path d="M10 10h4v4h-4z" fill="#4285F4" />
        </svg>
      </button>

      {/* 4. Mobile Bottom Navigation Bar (Google Drive Mobile App Style) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed md:hidden bottom-0 inset-x-0 h-16 bg-surface/95 dark:bg-[#1E1F20]/95 backdrop-blur-md border-t border-divider/40 flex items-center justify-around z-30 px-1 select-none"
      >
        {bottomNavItems.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => onRouteChange(item.route)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all ${
                isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="relative flex items-center justify-center w-12 h-7 rounded-full">
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    className="absolute inset-0 rounded-full bg-[#C2E7FF] dark:bg-[#004A77]"
                  />
                )}
                <Icon
                  name={item.icon}
                  size={20}
                  className={`relative z-10 ${isActive ? 'text-[#001D35] dark:text-[#C2E7FF]' : 'text-text-secondary'}`}
                />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-semibold text-text-primary' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 5. Mobile Bottom Action Sheet for Create / Upload */}
      {isMobileNewSheetOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col justify-end"
          onClick={() => setIsMobileNewSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-surface dark:bg-[#1E1F20] rounded-t-3xl border-t border-divider/40 p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-divider rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-base font-semibold text-text-primary">Create new</h3>
              <button
                type="button"
                onClick={() => setIsMobileNewSheetOpen(false)}
                className="p-1 rounded-full text-text-secondary hover:text-text-primary"
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Upload Files */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileNewSheetOpen(false);
                  onUploadFiles();
                }}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-hover active:scale-[0.98] transition-all text-left cursor-pointer border border-divider/30"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Icon name="upload" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">Upload files</div>
                  <div className="text-xs text-text-secondary">Documents, PDFs, audio, archives & more</div>
                </div>
              </button>

              {/* Option 2: Photos & Videos */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileNewSheetOpen(false);
                  if (onUploadPhotos) onUploadPhotos();
                  else onUploadFiles();
                }}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-hover active:scale-[0.98] transition-all text-left cursor-pointer border border-divider/30"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Icon name="image" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">Photos & Videos</div>
                  <div className="text-xs text-text-secondary">Upload from photo library or camera</div>
                </div>
              </button>

              {/* Option 3: New Folder */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileNewSheetOpen(false);
                  onNewFolder();
                }}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-hover active:scale-[0.98] transition-all text-left cursor-pointer border border-divider/30"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon name="folder" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">New folder</div>
                  <div className="text-xs text-text-secondary">Create a new encrypted folder</div>
                </div>
              </button>

              {/* Option 4: Folder Upload */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileNewSheetOpen(false);
                  onUploadFolder();
                }}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-card hover:bg-hover active:scale-[0.98] transition-all text-left cursor-pointer border border-divider/30"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Icon name="drive_file_move" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">Folder upload</div>
                  <div className="text-xs text-text-secondary">Upload complete directory structure</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
