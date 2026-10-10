import React, { useState } from 'react';
import { Chip } from './ui/Chip';
import { Menu, MenuItemProps } from './ui/Menu';
import { Icon } from './ui/Icon';

export type FilterCategory = 'all' | 'images' | 'videos' | 'pdfs' | 'docs' | 'audio' | 'archives' | 'folders';
export type FilterModified = 'all' | 'today' | '7days' | '30days' | 'this_year';

interface DriveFilterChipsProps {
  categoryFilter: FilterCategory;
  onCategoryFilterChange: (cat: FilterCategory) => void;
  modifiedFilter: FilterModified;
  onModifiedFilterChange: (mod: FilterModified) => void;
}

export const DriveFilterChips: React.FC<DriveFilterChipsProps> = ({
  categoryFilter,
  onCategoryFilterChange,
  modifiedFilter,
  onModifiedFilterChange
}) => {
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [isModMenuOpen, setIsModMenuOpen] = useState(false);
  const [typeAnchor, setTypeAnchor] = useState<{ x: number; y: number } | null>(null);
  const [modAnchor, setModAnchor] = useState<{ x: number; y: number } | null>(null);

  const typeLabels: Record<FilterCategory, string> = {
    all: 'Type',
    images: 'Photos & images',
    videos: 'Videos',
    pdfs: 'PDFs',
    docs: 'Documents',
    audio: 'Audio',
    archives: 'Archives',
    folders: 'Folders'
  };

  const typeMenuItems: MenuItemProps[] = [
    { label: 'Photos & images', icon: 'image', onClick: () => onCategoryFilterChange('images') },
    { label: 'Videos', icon: 'video', onClick: () => onCategoryFilterChange('videos') },
    { label: 'PDFs', icon: 'pdf', onClick: () => onCategoryFilterChange('pdfs') },
    { label: 'Documents', icon: 'doc', onClick: () => onCategoryFilterChange('docs') },
    { label: 'Audio', icon: 'audio', onClick: () => onCategoryFilterChange('audio') },
    { label: 'Archives', icon: 'archive', onClick: () => onCategoryFilterChange('archives') },
    { label: 'Folders', icon: 'folder', onClick: () => onCategoryFilterChange('folders') }
  ];

  const modLabels: Record<FilterModified, string> = {
    all: 'Modified',
    today: 'Today',
    '7days': 'Last 7 days',
    '30days': 'Last 30 days',
    this_year: 'This year'
  };

  const modMenuItems: MenuItemProps[] = [
    { label: 'Today', onClick: () => onModifiedFilterChange('today') },
    { label: 'Last 7 days', onClick: () => onModifiedFilterChange('7days') },
    { label: 'Last 30 days', onClick: () => onModifiedFilterChange('30days') },
    { label: 'This year', onClick: () => onModifiedFilterChange('this_year') }
  ];

  const hasActiveFilters = categoryFilter !== 'all' || modifiedFilter !== 'all';

  return (
    <div className="flex items-center gap-2 px-4 py-2 select-none shrink-0 border-b border-divider/20 overflow-x-auto">
      {/* Type Chip */}
      <div>
        <Chip
          label={typeLabels[categoryFilter]}
          active={categoryFilter !== 'all'}
          onClick={(e: any) => {
            const target = e?.currentTarget as HTMLElement | undefined;
            if (target) {
              const rect = target.getBoundingClientRect();
              setTypeAnchor({ x: rect.left, y: rect.bottom + 4 });
            }
            setIsTypeMenuOpen(true);
          }}
          onClear={() => onCategoryFilterChange('all')}
        />
      </div>

      {/* Modified Chip */}
      <div>
        <Chip
          label={modLabels[modifiedFilter]}
          active={modifiedFilter !== 'all'}
          onClick={(e: any) => {
            const target = e?.currentTarget as HTMLElement | undefined;
            if (target) {
              const rect = target.getBoundingClientRect();
              setModAnchor({ x: rect.left, y: rect.bottom + 4 });
            }
            setIsModMenuOpen(true);
          }}
          onClear={() => onModifiedFilterChange('all')}
        />
      </div>

      {/* Quick Reset All Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onCategoryFilterChange('all');
            onModifiedFilterChange('all');
          }}
          className="h-8 px-2.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors flex items-center gap-1 shrink-0 focus:outline-none"
          title="Reset all filters"
        >
          <Icon name="close" size={13} />
          <span>Reset filters</span>
        </button>
      )}

      {/* Type Dropdown */}
      {isTypeMenuOpen && (
        <Menu
          items={typeMenuItems}
          isOpen={isTypeMenuOpen}
          onClose={() => setIsTypeMenuOpen(false)}
          anchorPoint={typeAnchor}
        />
      )}

      {/* Modified Dropdown */}
      {isModMenuOpen && (
        <Menu
          items={modMenuItems}
          isOpen={isModMenuOpen}
          onClose={() => setIsModMenuOpen(false)}
          anchorPoint={modAnchor}
        />
      )}
    </div>
  );
};
