import React, { useRef, useEffect, useState } from 'react';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Menu, MenuItemProps } from './ui/Menu';
import { BrandLogo } from './ui/BrandLogo';

interface DriveHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onLogout: () => void;
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onToggleSidebar?: () => void;
}

export const DriveHeader: React.FC<DriveHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onLock,
  onLogout,
  currentTheme,
  onThemeChange,
  onToggleSidebar
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Keyboard shortcut '/' focuses search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const accountMenuItems: MenuItemProps[] = [
    {
      label: 'Settings',
      icon: 'settings',
      onClick: onOpenSettings
    },
    {
      label: `Theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`,
      icon: 'tune',
      onClick: () => {
        const nextTheme =
          currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
        onThemeChange(nextTheme);
      }
    },
    {
      label: 'Lock Vault',
      icon: 'lock',
      dividerAbove: true,
      onClick: onLock
    },
    {
      label: 'Log out',
      icon: 'close',
      danger: true,
      onClick: onLogout
    }
  ];

  return (
    <header className="h-16 px-4 flex items-center justify-between gap-4 bg-page select-none shrink-0 border-b border-divider/20 sm:border-none">
      {/* Left: Hamburger (mobile), Google Drive-styled logo + TeleVault wordmark */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[240px] shrink-0">
        {onToggleSidebar && (
          <IconButton
            size="md"
            aria-label="Navigation menu"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Icon name="menu" size={20} />
          </IconButton>
        )}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => (window.location.hash = '#/drive')}
        >
          <BrandLogo size={30} className="transition-transform duration-200 group-hover:scale-105" />
          <span className="text-[22px] font-normal tracking-tight text-[#444746] dark:text-[#E3E3E3] hidden sm:inline">
            TeleVault
          </span>
        </div>
      </div>

      {/* Center: Google Drive Search Pill */}
      <div className="flex-1 max-w-[720px] min-w-[120px]">
        <div className="relative flex items-center w-full h-12 rounded-full bg-[#E9EEF6] dark:bg-[#282A2C] focus-within:bg-white dark:focus-within:bg-[#1E1F20] focus-within:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] transition-all duration-200 ease-out px-4">
          <Icon name="search" size={20} className="text-[#444746] dark:text-[#C4C7C5] shrink-0 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in Drive"
            className="w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-secondary/70 focus:outline-none"
          />
          {searchQuery ? (
            <IconButton
              size="sm"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="text-text-secondary hover:text-text-primary shrink-0 ml-1"
            >
              <Icon name="close" size={18} />
            </IconButton>
          ) : (
            <Tooltip text="Search options">
              <IconButton size="sm" aria-label="Search filters" className="text-text-secondary hover:text-text-primary shrink-0 ml-1">
                <Icon name="tune" size={18} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Right: Settings, Lock, and Account Avatar */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
        <Tooltip text="Settings">
          <IconButton aria-label="Settings" onClick={onOpenSettings} className="hidden sm:inline-flex">
            <Icon name="settings" size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip text="Lock vault">
          <IconButton aria-label="Lock vault" onClick={onLock} className="hidden sm:inline-flex">
            <Icon name="lock" size={20} />
          </IconButton>
        </Tooltip>

        {/* Circular Avatar */}
        <button
          type="button"
          aria-label="Account options"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setAccountMenuAnchor({ x: rect.right - 240, y: rect.bottom + 8 });
            setIsAccountMenuOpen(true);
          }}
          className="w-9 h-9 ml-1.5 rounded-full bg-accent text-white font-medium text-sm flex items-center justify-center hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          T
        </button>

        <Menu
          items={accountMenuItems}
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          anchorPoint={accountMenuAnchor}
        />
      </div>
    </header>
  );
};
