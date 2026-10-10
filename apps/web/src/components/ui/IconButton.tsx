import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  size = 'md',
  active = false,
  tooltip,
  children,
  className = '',
  disabled,
  title,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2.5',
    lg: 'w-12 h-12 p-3'
  }[size];

  const activeStyles = active
    ? 'bg-selected text-text-on-selected'
    : 'text-text-secondary hover:text-text-primary hover:bg-hover active:bg-hover';

  return (
    <button
      className={`relative inline-flex items-center justify-center rounded-full transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${activeStyles} ${className}`}
      disabled={disabled}
      title={tooltip || title}
      {...props}
    >
      {children}
    </button>
  );
};
