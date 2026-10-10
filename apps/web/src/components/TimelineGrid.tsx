import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ItemManifest, decryptThumbnail, hexToBytes } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { api } from '../api';
import { idb } from '../db';
import { DriveEmptyState } from './DriveEmptyState';

interface TimelineGridProps {
  items: ItemManifest[];
  thumbKey: CryptoKey | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onItemClick: (item: ItemManifest) => void;
  onDropFiles: (files: FileList | File[]) => void;
  filterLabel?: string;
}

const GAP = 8; // px gap between items

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  items,
  thumbKey,
  selectedIds,
  onToggleSelect,
  onItemClick,
  onDropFiles
}) => {
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Monitor parent width for dynamic, pixel-perfect column calculation
  useEffect(() => {
    if (!parentRef.current) return;
    const updateWidth = () => {
      if (parentRef.current) {
        setContainerWidth(parentRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(() => {
      updateWidth();
    });
    ro.observe(parentRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute column count to match viewport width
  const columns = useMemo(() => {
    const w = containerWidth || 1000;
    if (w < 480) return 2;
    if (w < 720) return 3;
    if (w < 960) return 4;
    if (w < 1280) return 5;
    return 6;
  }, [containerWidth]);

  // Compute row height for aspect-square items + gap
  const rowHeight = useMemo(() => {
    const w = containerWidth || 1000;
    const padding = 32; // 16px left + 16px right padding
    const availableWidth = Math.max(200, w - padding - (columns - 1) * GAP);
    const itemWidth = Math.floor(availableWidth / columns);
    return itemWidth + GAP;
  }, [containerWidth, columns]);

  // Group all photos and videos by month
  const groupedSections = useMemo(() => {
    const groups: Array<{ title: string; items: ItemManifest[] }> = [];
    const map = new Map<string, ItemManifest[]>();

    const sorted = [...items].sort((a, b) => {
      const da = new Date(a.takenAt || a.uploadedAt).getTime();
      const db = new Date(b.takenAt || b.uploadedAt).getTime();
      return db - da; // Newest first
    });

    for (const item of sorted) {
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

  interface VirtualRow {
    type: 'header' | 'grid';
    title?: string;
    items?: ItemManifest[];
    startIndex?: number;
  }

  // Chunk items into rows strictly matching the responsive column count
  const virtualRows: VirtualRow[] = useMemo(() => {
    const rows: VirtualRow[] = [];
    for (const group of groupedSections) {
      rows.push({ type: 'header', title: group.title });
      for (let i = 0; i < group.items.length; i += columns) {
        rows.push({
          type: 'grid',
          items: group.items.slice(i, i + columns),
          startIndex: i
        });
      }
    }
    return rows;
  }, [groupedSections, columns]);

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = virtualRows[index];
      return row && row.type === 'header' ? 44 : rowHeight;
    },
    overscan: 4
  });

  // Batch load thumbnails in viewport
  useEffect(() => {
    if (!thumbKey || virtualRows.length === 0) return;

    let active = true;
    const visibleRows = rowVirtualizer.getVirtualItems();
    const visibleIds: string[] = [];

    for (const vRow of visibleRows) {
      const row = virtualRows[vRow.index];
      if (row && row.type === 'grid' && row.items) {
        for (const item of row.items) {
          if (!thumbUrls[item.id]) {
            visibleIds.push(item.id);
          }
        }
      }
    }

    if (visibleIds.length === 0) return;

    async function loadBatch() {
      const toFetchFromApi: string[] = [];
      const newUrls: Record<string, string> = {};

      for (const id of visibleIds) {
        const cachedBytes = await idb.getCachedThumb(id);
        if (cachedBytes) {
          newUrls[id] = URL.createObjectURL(new Blob([cachedBytes as BlobPart], { type: 'image/webp' }));
        } else {
          toFetchFromApi.push(id);
        }
      }

      if (toFetchFromApi.length > 0) {
        try {
          const fetchedHex = await api.getThumbs(toFetchFromApi);
          for (const [id, hex] of Object.entries(fetchedHex)) {
            try {
              const cipherBytes = hexToBytes(hex);
              const plainBytes = await decryptThumbnail(thumbKey!, hexToBytes(id), cipherBytes);
              const blob = new Blob([plainBytes as BlobPart], { type: 'image/webp' });
              await idb.setCachedThumb(id, plainBytes);
              newUrls[id] = URL.createObjectURL(blob);
            } catch (err) {
              console.error(`Failed to decrypt thumb for ${id}:`, err);
            }
          }
        } catch (err) {
          console.error('Batch thumb fetch failed:', err);
        }
      }

      if (active && Object.keys(newUrls).length > 0) {
        setThumbUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    loadBatch();

    return () => {
      active = false;
    };
  }, [virtualRows, rowVirtualizer.getVirtualItems(), thumbKey, thumbUrls]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface rounded-panel border border-divider/40">
        <DriveEmptyState type="drive" />
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 h-full bg-surface rounded-panel overflow-y-auto p-4 sm:p-6 border border-divider/40 select-none shadow-sm"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files) onDropFiles(e.dataTransfer.files);
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowData = virtualRows[virtualRow.index];
          if (!rowData) return null;

          if (rowData.type === 'header') {
            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className="flex items-center text-sm font-semibold text-text-primary px-1 pt-3 pb-2"
              >
                {rowData.title}
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: `${GAP}px`
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${GAP}px`
                }}
                className="px-1"
              >
                {rowData.items?.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isVideo = item.mime.startsWith('video/');
                  const isStarred = item.starred || item.favorite;
                  const url = thumbUrls[item.id];

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      title={item.name}
                      onClick={() => onItemClick(item)}
                      className={`group relative aspect-square rounded-lg overflow-hidden bg-card cursor-pointer border-2 transition-all duration-150 ${
                        isSelected
                          ? 'border-accent shadow-md'
                          : 'border-transparent hover:border-divider'
                      }`}
                    >
                      {/* Hidden text for screen readers & Playwright accessibility tests */}
                      <span className="sr-only">{item.name}</span>

                      {/* Checkbox overlay on hover */}
                      <button
                        type="button"
                        aria-label={`Select ${item.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(item.id, e);
                        }}
                        className={`absolute top-2 left-2 z-10 p-1 rounded-full transition-opacity ${
                          isSelected
                            ? 'opacity-100 text-accent bg-surface shadow'
                            : 'opacity-0 group-hover:opacity-100 text-white bg-black/40 hover:bg-black/60'
                        }`}
                      >
                        <Icon
                          name={isSelected ? 'check_circle' : ('circle' as any)}
                          size={20}
                        />
                      </button>

                      {/* Star badge */}
                      {isStarred && (
                        <div className="absolute top-2 right-2 z-10 text-amber-400 drop-shadow">
                          <Icon name="star_filled" size={16} />
                        </div>
                      )}

                      {/* Image / Video thumbnail */}
                      {url ? (
                        <img
                          src={url}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon
                            name={isVideo ? 'video' : 'image'}
                            size={32}
                            className="text-text-secondary/50"
                          />
                        </div>
                      )}

                      {/* Video duration badge */}
                      {isVideo && (
                        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                          <Icon name="play_arrow" size={12} />
                          {item.durationMs
                            ? `${Math.floor(item.durationMs / 60000)}:${Math.floor(
                                (item.durationMs % 60000) / 1000
                              )
                                .toString()
                                .padStart(2, '0')}`
                            : 'Video'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
