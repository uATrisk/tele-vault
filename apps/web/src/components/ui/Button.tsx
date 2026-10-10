import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-white hover:brightness-105 active:brightness-95 shadow-xs',
        tonal:
          'bg-selected text-text-on-selected hover:opacity-90 active:opacity-100',
        text:
          'text-text-primary hover:bg-hover active:bg-hover',
        danger:
          'bg-danger text-white hover:brightness-105 active:brightness-95 shadow-xs',
        outline:
          'border border-divider/60 text-text-primary hover:bg-hover active:bg-hover/80'
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-full gap-1.5',
        md: 'h-10 px-5 text-sm rounded-full gap-2',
        lg: 'h-12 px-6 text-base rounded-full gap-2.5',
        icon: 'h-9 w-9 rounded-full p-0'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
