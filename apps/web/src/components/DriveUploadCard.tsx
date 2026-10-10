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

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

export const DriveUploadCard: React.FC<DriveUploadCardProps> = ({
  queue,
  onResume,
  onCancel,
  onClearDone,
  onClose
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (queue.length === 0) return null;

  const inProgress = queue.filter(
    (i) => i.status === 'uploading' || i.status === 'processing' || i.status === 'queued'
  );
  const allCompleted = inProgress.length === 0;

  // Calculate real aggregate byte progress
  const totalBytes = queue.reduce((acc, it) => acc + (it.size || 1), 0);
  const uploadedBytes = queue.reduce((acc, it) => {
    if (it.status === 'done' || it.status === 'skipped') return acc + (it.size || 0);
    return acc + (it.bytesUploaded || 0);
  }, 0);
  const overallPct = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;

  const headerTitle = allCompleted
    ? `${queue.length} upload${queue.length === 1 ? '' : 's'} complete`
    : `Uploading ${inProgress.length} item${inProgress.length === 1 ? '' : 's'}`;

  return (
    <aside
      aria-label="Upload progress"
      className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:w-96 bg-surface dark:bg-[#1E1F20] text-text-primary rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] border border-divider/60 select-none overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-4"
    >
      {/* 1. Header (Google Drive Material 3 floating header) */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-[#1F1F1F] dark:bg-[#2A2B2E] text-white transition-colors ${
          isMinimized ? 'rounded-2xl' : 'rounded-t-2xl'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
          {allCompleted ? (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Icon name="check" size={15} />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-500/25 text-[#8AB4F8] flex items-center justify-center shrink-0">
              <Icon name="upload" size={15} className="animate-pulse" />
            </div>
          )}

          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-[13px] font-medium tracking-tight truncate">{headerTitle}</span>
            {!allCompleted && (
              <span className="text-[11px] text-white/70 font-mono tracking-tight truncate">
                {overallPct}% • {formatBytes(uploadedBytes)} of {formatBytes(totalBytes)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-white/80 shrink-0 ml-2">
          <IconButton
            size="sm"
            aria-label={isMinimized ? 'Expand upload card' : 'Minimize upload card'}
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Icon
              name="chevron_down"
              size={18}
              className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`}
            />
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

      {/* 2. Master aggregate progress bar */}
      {!allCompleted && (
        <div className="w-full h-1 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1A73E8] to-[#8AB4F8] transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, overallPct)}%` }}
          />
        </div>
      )}

      {/* 3. Body List (Collapsible) */}
      {!isMinimized && (
        <>
          <div className="max-h-72 overflow-y-auto divide-y divide-divider/15 text-xs">
            {queue.map((item) => {
              const meta = getFileTypeMeta(item.file.type, 'file', item.file.name);
              const isDone = item.status === 'done';
              const isError = item.status === 'error';
              const isSkipped = item.status === 'skipped';
              const isUploading = item.status === 'uploading';
              const isProcessing = item.status === 'processing';
              const isQueued = item.status === 'queued';

              return (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-hover/80 transition-colors"
                >
                  {/* File Icon */}
                  <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Icon name={meta.icon} size={20} className={meta.color} />
                  </div>

                  {/* File Details */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[13px] text-text-primary" title={item.file.name}>
                      {item.file.name}
                    </div>

                    <div className="text-[11px] truncate mt-0.5">
                      {isSkipped ? (
                        <span className="text-text-secondary">Already in vault (deduplicated)</span>
                      ) : isError ? (
                        <span className="text-red-500 font-medium">{item.error || 'Upload error'}</span>
                      ) : isDone ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Icon name="check" size={12} /> {formatBytes(item.size)} • Complete
                        </span>
                      ) : isProcessing ? (
                        <span className="text-[#1A73E8] dark:text-[#8AB4F8] flex items-center gap-1 font-medium">
                          <Icon name="lock" size={11} className="animate-spin" />
                          {item.subStatus === 'hashing'
                            ? 'Verifying integrity...'
                            : item.subStatus === 'finalizing'
                            ? 'Finalizing vault commit...'
                            : 'Encrypting (AES-256-GCM)...'}
                        </span>
                      ) : isUploading ? (
                        <span className="text-text-secondary flex items-center gap-1.5 font-mono">
                          <span>{formatBytes(item.bytesUploaded)}</span> of <span>{formatBytes(item.size)}</span>
                          <span className="font-sans font-medium text-text-primary">• {item.progress}%</span>
                          {item.speed > 0 && <span className="font-sans text-text-secondary">• {formatSpeed(item.speed)}</span>}
                        </span>
                      ) : isQueued ? (
                        <span className="text-text-secondary">Waiting in queue...</span>
                      ) : null}
                    </div>

                    {/* Per-item progress bar */}
                    {(isUploading || isProcessing) && (
                      <div className="w-full h-1 bg-divider/40 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-150"
                          style={{
                            width: `${Math.max(5, item.progress)}%`
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Status / Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDone && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Icon name="check" size={14} />
                      </div>
                    )}
                    {isSkipped && (
                      <Icon name="cloud_done" size={18} className="text-text-secondary" />
                    )}
                    {isError && (
                      <button
                        type="button"
                        onClick={() => onResume(item.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    {(isUploading || isProcessing || isQueued) && (
                      <button
                        type="button"
                        onClick={() => onCancel(item.id)}
                        aria-label="Cancel upload"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Cancel upload"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Footer action when all completed */}
          {allCompleted && (
            <div className="px-4 py-2.5 bg-card/60 border-t border-divider/20 flex items-center justify-between text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Icon name="shield" size={13} className="text-accent" />
                Zero-knowledge encrypted
              </span>
              <button
                type="button"
                onClick={onClearDone}
                className="text-accent hover:underline font-medium px-1 py-0.5"
              >
                Clear all
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
};
