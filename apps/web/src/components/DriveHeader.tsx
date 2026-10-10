import React, { useRef, useEffect, useState } from 'react';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { BrandLogo } from './ui/BrandLogo';
import { ThemeSwitch } from './ui/ThemeSwitch';
import { FilterCategory, FilterModified } from './DriveFilterChips';

interface DriveHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter?: FilterCategory;
  onCategoryFilterChange?: (cat: FilterCategory) => void;
  modifiedFilter?: FilterModified;
  onModifiedFilterChange?: (mod: FilterModified) => void;
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
  categoryFilter = 'all',
  onCategoryFilterChange,
  modifiedFilter = 'all',
  onModifiedFilterChange,
  onOpenSettings,
  onLock,
  onLogout,
  currentTheme,
  onThemeChange,
  onToggleSidebar
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSearchOptionsOpen, setIsSearchOptionsOpen] = useState(false);

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

  // Close search options popover when clicking outside
  useEffect(() => {
    if (!isSearchOptionsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isSearchOptionsOpen]);

  // Close account menu popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(e.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const hasActiveFilters = categoryFilter !== 'all' || modifiedFilter !== 'all' || Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    onCategoryFilterChange?.('all');
    onModifiedFilterChange?.('all');
    onSearchChange('');
  };

  const isDark =
    currentTheme === 'dark' ||
    (currentTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="h-16 px-4 flex items-center justify-between gap-4 bg-page select-none shrink-0 border-b border-divider/20 sm:border-none relative z-30">
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
          <BrandLogo size={32} className="transition-transform duration-200 group-hover:scale-105" />
          <span className="text-[22px] font-normal tracking-tight text-[#444746] dark:text-[#E3E3E3] hidden sm:inline">
            TeleVault
          </span>
        </div>
      </div>

      {/* Center: Google Drive Search Pill */}
      <div ref={searchContainerRef} className="flex-1 max-w-[720px] min-w-[120px] relative">
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

          {searchQuery && (
            <IconButton
              size="sm"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="text-text-secondary hover:text-text-primary shrink-0 mr-1"
            >
              <Icon name="close" size={18} />
            </IconButton>
          )}

          <Tooltip text="Search options">
            <IconButton
              size="sm"
              aria-label="Search filters"
              onClick={() => setIsSearchOptionsOpen((prev) => !prev)}
              className={`shrink-0 ml-1 transition-colors ${
                categoryFilter !== 'all' || modifiedFilter !== 'all'
                  ? 'text-accent bg-accent/15 hover:bg-accent/25'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon name="tune" size={18} />
            </IconButton>
          </Tooltip>
        </div>

        {/* Google Drive-style Search Options Popover */}
        {isSearchOptionsOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-5 bg-surface rounded-2xl shadow-dialog border border-divider/40 text-text-primary text-sm z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-divider/30 mb-4">
              <span className="font-semibold text-text-primary">Search options</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-medium text-text-secondary">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all' as FilterCategory, label: 'Any type' },
                  { id: 'images' as FilterCategory, label: 'Photos & images' },
                  { id: 'videos' as FilterCategory, label: 'Videos' },
                  { id: 'pdfs' as FilterCategory, label: 'PDFs' },
                  { id: 'docs' as FilterCategory, label: 'Documents' },
                  { id: 'audio' as FilterCategory, label: 'Audio' },
                  { id: 'archives' as FilterCategory, label: 'Archives' },
                  { id: 'folders' as FilterCategory, label: 'Folders' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onCategoryFilterChange?.(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      categoryFilter === t.id
                        ? 'bg-selected text-text-on-selected font-semibold shadow-xs'
                        : 'bg-card text-text-secondary hover:bg-hover hover:text-text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Modified Filter */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-medium text-text-secondary">Date modified</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all' as FilterModified, label: 'Any time' },
                  { id: 'today' as FilterModified, label: 'Today' },
                  { id: '7days' as FilterModified, label: 'Last 7 days' },
                  { id: '30days' as FilterModified, label: 'Last 30 days' },
                  { id: 'this_year' as FilterModified, label: 'This year' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onModifiedFilterChange?.(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      modifiedFilter === m.id
                        ? 'bg-selected text-text-on-selected font-semibold shadow-xs'
                        : 'bg-card text-text-secondary hover:bg-hover hover:text-text-primary'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Words / Item name */}
            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-medium text-text-secondary">Item name contains</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name or extension"
                className="w-full bg-card border border-divider/40 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider/30">
              <button
                type="button"
                onClick={() => setIsSearchOptionsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOptionsOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:opacity-90 shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Theme Toggle Switch, Settings, Lock, and Account Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end relative">
        {/* Day / Night Theme Switch */}
        <Tooltip text={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <ThemeSwitch
            isDark={isDark}
            onToggle={() => onThemeChange(isDark ? 'light' : 'dark')}
          />
        </Tooltip>

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
          ref={avatarButtonRef}
          type="button"
          aria-label="Account options"
          aria-expanded={isAccountMenuOpen}
          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          className="w-9 h-9 ml-1 sm:ml-1.5 rounded-full bg-accent text-white font-medium text-sm flex items-center justify-center hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent cursor-pointer"
        >
          T
        </button>

        {/* Account Profile Popover (Authentic Google Drive Style) */}
        {isAccountMenuOpen && (
          <div
            ref={accountMenuRef}
            role="menu"
            className="absolute right-0 top-12 mt-2 w-72 p-3 bg-surface text-text-primary rounded-2xl shadow-[0_10px_36px_rgba(0,0,0,0.16),0_2px_10px_rgba(0,0,0,0.06)] border border-divider/40 select-none animate-in fade-in zoom-in-95 duration-150 z-50"
          >
            {/* Account Identity Header */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-hover/40 mb-2">
              <div className="w-10 h-10 rounded-full bg-accent text-white font-semibold text-base flex items-center justify-center shrink-0 shadow-xs">
                T
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-text-primary truncate">TeleVault</div>
                <div className="text-[12px] text-text-secondary truncate mt-0.5">Private Telegram Cloud</div>
              </div>
            </div>

            {/* Menu Action Items */}
            <div className="space-y-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full h-11 px-3.5 rounded-xl flex items-center gap-3.5 text-[14px] font-medium text-text-primary hover:bg-hover active:bg-hover/80 transition-colors cursor-pointer text-left"
              >
                <span className="text-text-secondary shrink-0">
                  <Icon name="settings" size={20} />
                </span>
                <span>Settings</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onLock();
                }}
                className="w-full h-11 px-3.5 rounded-xl flex items-center gap-3.5 text-[14px] font-medium text-text-primary hover:bg-hover active:bg-hover/80 transition-colors cursor-pointer text-left"
              >
                <span className="text-text-secondary shrink-0">
                  <Icon name="lock" size={20} />
                </span>
                <span>Lock Vault</span>
              </button>
            </div>

            {/* Clean Divider */}
            <div className="my-2 border-t border-divider/30" />

            {/* Log out Button */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onLogout();
              }}
              className="w-full h-11 px-3.5 rounded-xl flex items-center gap-3.5 text-[14px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors cursor-pointer text-left"
            >
              <span className="text-red-500 shrink-0">
                <Icon name="logout" size={20} />
              </span>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
