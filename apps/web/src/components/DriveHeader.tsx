import React, { useRef, useEffect, useState } from 'react';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Menu, MenuItemProps } from './ui/Menu';

interface DriveHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onLogout: () => void;
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onToggleSidebar?: () => void;
  onOpenShowcase?: () => void;
}

export const DriveHeader: React.FC<DriveHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onLock,
  onLogout,
  currentTheme,
  onThemeChange,
  onToggleSidebar,
  onOpenShowcase
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
    ...(onOpenShowcase
      ? [
          {
            label: 'Design System Showcase',
            icon: 'help' as const,
            onClick: onOpenShowcase
          }
        ]
      : []),
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
      {/* Left: Hamburger (mobile), Shield Logo + TeleVault wordmark */}
      <div className="flex items-center gap-3 min-w-[240px]">
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
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => (window.location.hash = '#/drive')}>
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Icon name="shield" size={24} />
          </div>
          <span className="text-[22px] font-medium tracking-tight text-text-primary">
            TeleVault
          </span>
        </div>
      </div>

      {/* Center: Search pill */}
      <div className="flex-1 max-w-[720px]">
        <div className="relative flex items-center w-full h-12 rounded-full bg-search focus-within:bg-surface focus-within:shadow-md border border-transparent focus-within:border-divider/30 transition-all duration-150 px-3.5">
          <Icon name="search" size={20} className="text-text-secondary shrink-0 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in My Drive"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          {searchQuery ? (
            <IconButton
              size="sm"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="text-text-secondary shrink-0 ml-1"
            >
              <Icon name="close" size={16} />
            </IconButton>
          ) : (
            <Tooltip text="Search options">
              <IconButton size="sm" aria-label="Search filters" className="text-text-secondary shrink-0 ml-1">
                <Icon name="tune" size={16} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Right: Settings, Lock, and Account Avatar */}
      <div className="flex items-center gap-1.5 min-w-[140px] justify-end">
        <Tooltip text="Settings">
          <IconButton aria-label="Settings" onClick={onOpenSettings}>
            <Icon name="settings" size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip text="Lock vault">
          <IconButton aria-label="Lock vault" onClick={onLock}>
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
