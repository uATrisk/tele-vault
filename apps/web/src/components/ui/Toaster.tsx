import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      position="bottom-left"
      gap={8}
      visibleToasts={4}
      toastOptions={{
        className:
          'bg-surface text-text-primary border border-divider/40 shadow-[0_8px_30px_rgba(0,0,0,0.16)] rounded-2xl p-4 text-sm font-medium flex items-center gap-3',
        descriptionClassName: 'text-text-secondary text-xs',
        actionButtonStyle: {
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          borderRadius: '9999px',
          fontWeight: 600,
          padding: '6px 14px',
          fontSize: '13px'
        },
        cancelButtonStyle: {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          borderRadius: '9999px',
          fontWeight: 500,
          padding: '6px 12px',
          fontSize: '13px'
        }
      }}
    />
  );
};

export { toast } from 'sonner';
