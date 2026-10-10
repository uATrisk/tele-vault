import React, { useEffect, useRef } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  className = ''
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidthStyles} bg-surface text-text-primary rounded-dialog p-6 shadow-dialog border border-divider/20 flex flex-col gap-4 animate-in zoom-in-95 duration-150 ${className}`}
      >
        {title && (
          <h2 className="text-xl font-medium text-text-primary tracking-tight">
            {title}
          </h2>
        )}
        <div className="text-sm text-text-secondary leading-relaxed">
          {children}
        </div>
        {actions && (
          <div className="flex items-center justify-end gap-2 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
