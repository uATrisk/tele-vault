import React from 'react';
import { Icon } from './Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  ariaLabel?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  onClick,
  className = '',
  ariaLabel = 'Select item'
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        onClick?.(e);
        onChange(!checked);
      }}
      className={`w-5 h-5 rounded flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        checked
          ? 'bg-accent text-white'
          : 'border-2 border-text-secondary/60 hover:border-text-primary bg-surface/80'
      } ${className}`}
    >
      {checked && <Icon name="check" size={16} />}
    </button>
  );
};
