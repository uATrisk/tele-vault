import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ItemManifest,
  decryptThumbnail,
  hexToBytes
} from '@televault/crypto';
import {
  Play,
  Star,
  CheckCircle2,
  Circle,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  Video
} from 'lucide-react';
import { api } from '../api';
import { idb } from '../db';

interface TimelineGridProps {
  items: ItemManifest[];
  thumbKey: CryptoKey | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey?: boolean) => void;
  onItemClick: (item: ItemManifest) => void;
  onDropFiles: (files: FileList | File[]) => void;
  filterLabel: string;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  items,
  thumbKey,
  selectedIds,
  onToggleSelect,
  onItemClick,
  onDropFiles,
  filterLabel
}) => {
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Group items by date (Year & Month)
  const groupedSections = React.useMemo(() => {
    const groups: Array<{ title: string; items: ItemManifest[] }> = [];
    const map = new Map<string, ItemManifest[]>();

    for (const item of items) {
      const d = new Date(item.takenAt || item.uploadedAt);
      const title = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long'
      });
      if (!map.has(title)) {
        map.set(title, []);
      }
      map.get(title)!.push(item);
    }

    for (const [title, list] of map.entries()) {
      groups.push({ title, items: list });
    }
    return groups;
  }, [items]);

  // Flatten into row items for virtualizer:
  // Each section has a header row, followed by rows of photo columns (e.g. 5 columns per row)
  const COLUMNS = 5;
  interface VirtualRow {
    type: 'header' | 'grid';
    title?: string;
    items?: ItemManifest[];
    startIndex?: number;
  }

  const virtualRows: VirtualRow[] = React.useMemo(() => {
    const rows: VirtualRow[] = [];
    for (const group of groupedSections) {
      rows.push({ type: 'header', title: group.title });
      for (let i = 0; i < group.items.length; i += COLUMNS) {
        rows.push({
          type: 'grid',
          items: group.items.slice(i, i + COLUMNS),
          startIndex: i
        });
      }
    }
    return rows;
  }, [groupedSections]);

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (virtualRows[index].type === 'header' ? 48 : 220),
    overscan: 5
  });

  // Lazy Thumbnail loader for visible items
  useEffect(() => {
    if (!thumbKey) return;

    const visibleItems: ItemManifest[] = [];
    for (const vRow of rowVirtualizer.getVirtualItems()) {
      const rowData = virtualRows[vRow.index];
      if (rowData?.type === 'grid' && rowData.items) {
        for (const it of rowData.items) {
          if (!thumbUrls[it.id]) {
            visibleItems.push(it);
          }
        }
      }
    }

    if (visibleItems.length === 0) return;

    // Load thumbnails in batches of 32
    const batch = visibleItems.slice(0, 32);
    const idsToFetch: string[] = [];

    const loadThumbs = async () => {
      const newUrls: Record<string, string> = {};

      for (const it of batch) {
        // Check IndexedDB cache first
        const cached = await idb.getCachedThumb(it.id);
        if (cached) {
          const blob = new Blob([cached as BlobPart], { type: 'image/webp' });
          newUrls[it.id] = URL.createObjectURL(blob);
        } else {
          idsToFetch.push(it.id);
        }
      }

      if (idsToFetch.length > 0) {
        const fetchedMap = await api.getThumbs(idsToFetch);
        for (const id of idsToFetch) {
          const cipherHex = fetchedMap[id];
          if (cipherHex) {
            try {
              const cipherBytes = hexToBytes(cipherHex);
              const plainThumbBytes = await decryptThumbnail(
                thumbKey,
                hexToBytes(id),
                cipherBytes
              );
              await idb.setCachedThumb(id, plainThumbBytes);
              const blob = new Blob([plainThumbBytes as BlobPart], { type: 'image/webp' });
              newUrls[id] = URL.createObjectURL(blob);
            } catch (err) {
              console.error('Failed to decrypt thumb:', err);
            }
          }
        }
      }

      setThumbUrls((prev) => ({ ...prev, ...newUrls }));
    };

    loadThumbs();
  }, [rowVirtualizer.getVirtualItems(), thumbKey, thumbUrls]);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = () => setIsDraggingOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  if (items.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 flex flex-col justify-center items-center p-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 mb-4 shadow-xl">
          <FolderOpen className="w-10 h-10" />
        </div>
        <h3 className="text-base font-semibold text-gray-300 mb-1">
          No files in {filterLabel}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mb-6">
          Drag and drop photos, videos, or folders here to encrypt and upload to your private Telegram channel.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 overflow-y-auto px-4 py-6 relative"
    >
      {/* Drag & drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 rounded-3xl flex flex-col items-center justify-center m-4 pointer-events-none">
          <ImageIcon className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-1">Drop Files to Upload</h2>
          <p className="text-sm text-emerald-300">
            Files will be encrypted in your browser and stored in Telegram.
          </p>
        </div>
      )}

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
          maxWidth: '1280px',
          margin: '0 auto'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowData = virtualRows[virtualRow.index];
          if (!rowData) return null;

          if (rowData.type === 'header') {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className="flex items-center"
              >
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider pl-1">
                  {rowData.title}
                </h3>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              {rowData.items?.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isVideo = item.mime.startsWith('video/');
                const thumbSrc = thumbUrls[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-gray-900 border transition cursor-pointer select-none ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50'
                        : 'border-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={item.name}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-600 bg-gray-950">
                        {isVideo ? (
                          <Video className="w-8 h-8 mb-2" />
                        ) : (
                          <FileText className="w-8 h-8 mb-2" />
                        )}
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">
                          {item.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Select Checkbox (top-left) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(item.id, e.shiftKey);
                      }}
                      className={`absolute top-2.5 left-2.5 p-1 rounded-full transition ${
                        isSelected
                          ? 'opacity-100 text-emerald-400 bg-black/40'
                          : 'opacity-0 group-hover:opacity-100 text-white/70 hover:text-white bg-black/30'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* Favorite Icon (top-right) */}
                    {item.favorite && (
                      <div className="absolute top-2.5 right-2.5 p-1 text-amber-400 drop-shadow">
                        <Star className="w-4 h-4 fill-amber-400" />
                      </div>
                    )}

                    {/* Video Duration Badge (bottom-right) */}
                    {isVideo && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-white font-medium flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {item.durationMs
                          ? `${Math.floor(item.durationMs / 60000)}:${(
                              '0' + Math.floor((item.durationMs % 60000) / 1000)
                            ).slice(-2)}`
                          : 'Video'}
                      </div>
                    )}

                    {/* File Name Pill on Hover */}
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition truncate text-[11px] text-white/90 drop-shadow">
                      {item.name}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
