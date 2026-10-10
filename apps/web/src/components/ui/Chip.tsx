import React from 'react';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onClear?: (e: React.MouseEvent) => void;
  hasDropdown?: boolean;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  onClick,
  onClear,
  hasDropdown = true,
  className = ''
}) => {
  if (active && onClear) {
    return (
      <div
        className={`inline-flex items-center h-8 rounded-lg text-xs font-medium select-none transition-colors bg-selected text-text-on-selected border border-transparent ${className}`}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1.5 h-full pl-3 pr-1.5 focus:outline-none hover:opacity-90 transition-opacity"
        >
          <span>{label}</span>
          {hasDropdown && <Icon name="chevron_down" size={14} className="opacity-70 shrink-0" />}
        </button>
        <button
          type="button"
          aria-label={`Clear ${label} filter`}
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          className="h-full pr-2 pl-1 flex items-center justify-center focus:outline-none text-text-on-selected hover:opacity-80"
          title={`Clear ${label} filter`}
        >
          <span className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center">
            <Icon name="close" size={13} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent bg-surface text-text-secondary border-divider hover:bg-hover hover:text-text-primary ${className}`}
    >
      <span>{label}</span>
      {hasDropdown && <Icon name="chevron_down" size={14} className="opacity-70 shrink-0" />}
    </button>
  );
};
