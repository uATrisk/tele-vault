import React, { useState, useRef } from 'react';
import { Chip } from './ui/Chip';
import { Menu, MenuItemProps } from './ui/Menu';

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

  const typeBtnRef = useRef<HTMLDivElement>(null);
  const modBtnRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex items-center gap-2 px-4 py-2 select-none shrink-0 border-b border-divider/20 overflow-x-auto">
      {/* Type Chip */}
      <div ref={typeBtnRef}>
        <Chip
          label={typeLabels[categoryFilter]}
          active={categoryFilter !== 'all'}
          onClick={() => setIsTypeMenuOpen(true)}
          onClear={() => onCategoryFilterChange('all')}
        />
      </div>

      {/* Modified Chip */}
      <div ref={modBtnRef}>
        <Chip
          label={modLabels[modifiedFilter]}
          active={modifiedFilter !== 'all'}
          onClick={() => setIsModMenuOpen(true)}
          onClear={() => onModifiedFilterChange('all')}
        />
      </div>

      {/* Type Dropdown */}
      {isTypeMenuOpen && typeBtnRef.current && (
        <Menu
          items={typeMenuItems}
          isOpen={isTypeMenuOpen}
          onClose={() => setIsTypeMenuOpen(false)}
          anchorPoint={{
            x: typeBtnRef.current.getBoundingClientRect().left,
            y: typeBtnRef.current.getBoundingClientRect().bottom + 4
          }}
        />
      )}

      {/* Modified Dropdown */}
      {isModMenuOpen && modBtnRef.current && (
        <Menu
          items={modMenuItems}
          isOpen={isModMenuOpen}
          onClose={() => setIsModMenuOpen(false)}
          anchorPoint={{
            x: modBtnRef.current.getBoundingClientRect().left,
            y: modBtnRef.current.getBoundingClientRect().bottom + 4
          }}
        />
      )}
    </div>
  );
};
