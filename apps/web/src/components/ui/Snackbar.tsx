import React, { useEffect } from 'react';

export interface SnackbarProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  isOpen,
  onClose,
  actionLabel,
  onAction,
  durationMs = 5000
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isOpen, onClose, durationMs]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-4 px-4 py-3 bg-[#323232] text-white rounded-lg shadow-lg text-sm select-none animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      <span className="max-w-xs truncate">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            onClose();
          }}
          className="text-[#A8C7FA] hover:text-[#C2E7FF] font-medium text-sm focus:outline-none focus:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
