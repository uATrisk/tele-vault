import React, { useState } from 'react';
import { UploadQueueItem } from '../upload/uploader';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { getFileTypeMeta } from '../utils/fileType';

interface DriveUploadCardProps {
  queue: UploadQueueItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onClearDone: () => void;
  onClose: () => void;
}

export const DriveUploadCard: React.FC<DriveUploadCardProps> = ({
  queue,
  onPause,
  onResume,
  onCancel,
  onClearDone,
  onClose
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (queue.length === 0) return null;

  const inProgress = queue.filter((i) => i.status === 'uploading' || i.status === 'processing' || i.status === 'queued');
  const allCompleted = inProgress.length === 0;

  // Calculate overall progress percentage
  const totalItems = queue.length;
  const completedItems = queue.filter((i) => i.status === 'done' || i.status === 'skipped').length;
  const overallPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const headerTitle = allCompleted
    ? `${queue.length} upload${queue.length === 1 ? '' : 's'} complete`
    : `Uploading ${inProgress.length} item${inProgress.length === 1 ? '' : 's'}`;

  return (
    <aside
      aria-label="Upload progress"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100%-32px)] sm:w-96 bg-surface text-text-primary rounded-2xl shadow-2xl border border-divider/60 select-none overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-4"
    >
      {/* Header (Floating bar with Google Drive styling) */}
      <div className="flex items-center justify-between h-12 px-4 bg-[#202124] text-white border-b border-white/10">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {allCompleted ? (
            <Icon name="check_circle" size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <Icon name="upload" size={18} className="text-accent animate-pulse shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{headerTitle}</span>
        </div>

        <div className="flex items-center gap-1 text-white/80">
          <IconButton
            size="sm"
            aria-label={isMinimized ? 'Expand upload card' : 'Minimize upload card'}
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Icon name={isMinimized ? 'chevron_down' : 'chevron_down'} size={18} className={`transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </IconButton>
          <IconButton
            size="sm"
            aria-label="Close upload card"
            onClick={() => {
              if (inProgress.length > 0) {
                const confirmed = window.confirm('Cancel uploads in progress?');
                if (!confirmed) return;
              }
              onClose();
            }}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Icon name="close" size={18} />
          </IconButton>
        </div>
      </div>

      {/* Thin overall progress bar */}
      {!allCompleted && (
        <div className="w-full h-1 bg-divider">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${Math.max(5, overallPct)}%` }}
          />
        </div>
      )}

      {/* Body List (Collapsible) */}
      {!isMinimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-divider/20 text-xs">
          {queue.map((item) => {
            const meta = getFileTypeMeta(item.file.type, 'file', item.file.name);
            const isDone = item.status === 'done';
            const isError = item.status === 'error';
            const isSkipped = item.status === 'skipped';
            const isUploading = item.status === 'uploading';

            return (
              <div key={item.id} className="flex items-center justify-between p-3 gap-3 hover:bg-hover transition-colors">
                {/* File Icon & Name */}
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                  <Icon name={meta.icon} size={18} className={meta.color} />
                  <div className="overflow-hidden flex-1">
                    <div className="truncate font-medium text-text-primary">{item.file.name}</div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {isSkipped
                        ? 'Skipped: already in your drive'
                        : isError
                        ? item.error || 'Upload error'
                        : isDone
                        ? 'Complete'
                        : `Part ${(item.uploadedChunks ?? 0) + 1} of ${item.totalChunks ?? 1}`}
                    </div>
                  </div>
                </div>

                {/* Right Status / Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isDone && <Icon name="check_circle" size={18} className="text-emerald-500" />}
                  {isSkipped && <Icon name="cloud_done" size={18} className="text-text-secondary" />}
                  {isError && (
                    <button
                      type="button"
                      onClick={() => onResume(item.id)}
                      className="text-accent hover:underline text-xs font-medium"
                    >
                      Retry
                    </button>
                  )}
                  {isUploading && (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 relative flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            className="text-divider"
                            strokeWidth="3"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            className="text-accent transition-all duration-200"
                            strokeWidth="3"
                            strokeDasharray={56.5}
                            strokeDashoffset={56.5 - (56.5 * ((item.uploadedChunks ?? 0) / Math.max(1, item.totalChunks ?? 1)))}
                          />
                        </svg>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCancel(item.id)}
                        className="text-text-secondary hover:text-text-primary text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
