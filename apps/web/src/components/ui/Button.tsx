import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'tonal' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:opacity-40 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-full gap-1.5',
    md: 'h-10 px-5 text-sm rounded-full gap-2',
    lg: 'h-12 px-6 text-base rounded-full gap-2.5'
  }[size];

  const variantStyles = {
    primary:
      'bg-accent text-white hover:brightness-105 active:brightness-95 shadow-sm',
    tonal:
      'bg-selected text-text-on-selected hover:opacity-90 active:opacity-100',
    text:
      'text-text-primary hover:bg-hover active:bg-hover',
    danger:
      'bg-danger text-white hover:brightness-105 active:brightness-95 shadow-sm'
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
