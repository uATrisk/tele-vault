import React from 'react';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active
          ? 'bg-selected text-text-on-selected border-transparent'
          : 'bg-surface text-text-secondary border-divider hover:bg-hover hover:text-text-primary'
      } ${className}`}
    >
      <span>{label}</span>
      {active && onClear ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          title="Clear filter"
        >
          <Icon name="close" size={14} />
        </span>
      ) : hasDropdown ? (
        <Icon name="chevron_down" size={14} className="opacity-70" />
      ) : null}
    </button>
  );
};
