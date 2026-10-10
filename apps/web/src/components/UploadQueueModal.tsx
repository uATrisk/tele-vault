import React from 'react';
import {
  X,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Upload
} from 'lucide-react';
import { UploadQueueItem } from '../upload/uploader';

interface UploadQueueModalProps {
  queue: UploadQueueItem[];
  onClose: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onClearDone: () => void;
}

export const UploadQueueModal: React.FC<UploadQueueModalProps> = ({
  queue,
  onClose,
  onPause,
  onResume,
  onCancel,
  onClearDone
}) => {
  const activeCount = queue.filter(
    (q) => q.status === 'uploading' || q.status === 'queued'
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Upload Activity</h3>
              <p className="text-[11px] text-gray-400">
                {activeCount > 0 ? `${activeCount} in progress` : 'All transfers idle'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.some((q) => q.status === 'done') && (
              <button
                onClick={onClearDone}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-gray-850 hover:bg-gray-800 transition cursor-pointer"
              >
                Clear Completed
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No recent uploads. Drag and drop files to start.
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate flex-1">
                    <p className="font-medium text-gray-200 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {(item.size / 1024 / 1024).toFixed(2)} MB
                      {item.speed > 0 && ` \u2022 ${(item.speed / 1024 / 1024).toFixed(2)} MB/s`}
                      {item.isDuplicate && ' \u2022 Duplicate skipped'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.status === 'done' && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Done
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 text-red-400 font-medium">
                        <AlertCircle className="w-4 h-4" /> Failed
                      </span>
                    )}

                    {item.status === 'uploading' && (
                      <button
                        onClick={() => onPause(item.id)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(item.status === 'paused' || item.status === 'error') && (
                      <button
                        onClick={() => onResume(item.id)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-emerald-400 cursor-pointer"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 cursor-pointer"
                      title="Cancel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {item.status !== 'done' && !item.isDuplicate && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.error && <p className="text-[10px] text-red-400">{item.error}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
