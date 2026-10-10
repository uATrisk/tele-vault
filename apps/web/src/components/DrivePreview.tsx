import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ItemManifest, deriveSubkey, decryptChunk, hexToBytes } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { getFileTypeMeta } from '../utils/fileType';
import { formatBytes } from '../utils/folderTree';
import { api } from '../api';
import { motion } from 'motion/react';
import { useDrag, usePinch } from '@use-gesture/react';

interface DrivePreviewProps {
  item: ItemManifest;
  allItems: ItemManifest[];
  masterKey: CryptoKey;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleStar: (item: ItemManifest) => void;
  onTrash: (item: ItemManifest) => void;
  onOpenDetails?: () => void;
  isTrashView?: boolean;
  onRestore?: (item: ItemManifest) => void;
  onDeleteForever?: (item: ItemManifest) => void;
}

export const DrivePreview: React.FC<DrivePreviewProps> = ({
  item,
  allItems,
  masterKey,
  onClose,
  onNext,
  onPrev,
  onToggleStar,
  onTrash,
  onOpenDetails,
  isTrashView,
  onRestore,
  onDeleteForever
}) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<string>('Decrypting media...');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const meta = getFileTypeMeta(item.mime, item.kind, item.name);
  const currentIndex = allItems.findIndex((i) => i.id === item.id);
  const isStarred = item.starred || item.favorite;

  // Decrypt media chunks into blob
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setIsLoading(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    async function loadFullMedia() {
      if (!meta.previewable) {
        setIsLoading(false);
        return;
      }

      try {
        const fileKey = await deriveSubkey(masterKey, `file/${item.id}`);
        const fileIdBytes = hexToBytes(item.id);
        const totalChunks = item.chunks.length;
        const decryptedChunks: Uint8Array[] = [];
        let totalBytes = 0;

        for (let idx = 0; idx < totalChunks; idx++) {
          if (!active) return;
          setLoadProgress(`Decrypting part ${idx + 1}/${totalChunks}...`);
          const c = item.chunks[idx];
          const cipherBytes = await api.downloadChunk(c.fileId);
          const plainBytes = await decryptChunk(fileKey, fileIdBytes, idx, totalChunks, cipherBytes);
          decryptedChunks.push(plainBytes);
          totalBytes += plainBytes.byteLength;
        }

        const fullBuffer = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of decryptedChunks) {
          fullBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const blob = new Blob([fullBuffer], { type: item.mime });
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setMediaUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to load media:', err);
        if (active) {
          setIsLoading(false);
          setLoadProgress(`Decryption failed: ${err.message || 'Unknown error'}`);
        }
      }
    }

    loadFullMedia();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, masterKey, meta.previewable]);

  // Keyboard navigation: Esc to close, Arrow keys for prev/next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Download media file
  const handleDownload = useCallback(async () => {
    try {
      let downloadBlob: Blob;
      if (mediaUrl) {
        const res = await fetch(mediaUrl);
        downloadBlob = await res.blob();
      } else {
        const fileKey = await deriveSubkey(masterKey, `file/${item.id}`);
        const fileIdBytes = hexToBytes(item.id);
        const totalChunks = item.chunks.length;
        const decryptedChunks: Uint8Array[] = [];
        let totalBytes = 0;

        for (let idx = 0; idx < totalChunks; idx++) {
          const c = item.chunks[idx];
          const cipherBytes = await api.downloadChunk(c.fileId);
          const plainBytes = await decryptChunk(fileKey, fileIdBytes, idx, totalChunks, cipherBytes);
          decryptedChunks.push(plainBytes);
          totalBytes += plainBytes.byteLength;
        }

        const fullBuffer = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of decryptedChunks) {
          fullBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }
        downloadBlob = new Blob([fullBuffer], { type: item.mime });
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(downloadBlob);
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Download failed');
    }
  }, [item, masterKey, mediaUrl]);

  // Drag down to dismiss, swipe left/right for next/prev
  const bind = useDrag(({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
    if (zoom > 1) {
      setPan({ x: mx, y: my });
      return;
    }

    if (!down && my > 100 && (vy > 0.4 || my > 180)) {
      onClose();
      return;
    }

    if (!down && Math.abs(mx) > 80 && (vx > 0.4 || Math.abs(mx) > 150)) {
      if (dx < 0 && currentIndex < allItems.length - 1) {
        onNext();
      } else if (dx > 0 && currentIndex > 0) {
        onPrev();
      }
    }
  });

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white select-none"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between h-16 px-4 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <IconButton size="md" aria-label="Back to drive" onClick={onClose} className="text-white hover:bg-white/10">
            <Icon name="arrow_back" size={20} />
          </IconButton>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Icon name={meta.icon} size={20} className={meta.color} />
            <span className="font-medium text-sm truncate max-w-md">{item.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip text="Download">
            <IconButton size="md" aria-label="Download" onClick={handleDownload} className="text-white hover:bg-white/10">
              <Icon name="download" size={20} />
            </IconButton>
          </Tooltip>

          {onOpenDetails && (
            <Tooltip text="Details">
              <IconButton size="md" aria-label="Details" onClick={onOpenDetails} className="text-white hover:bg-white/10">
                <Icon name="info" size={20} />
              </IconButton>
            </Tooltip>
          )}

          {isTrashView || item.trashed ? (
            <>
              {onRestore && (
                <Tooltip text="Restore from trash">
                  <IconButton
                    size="md"
                    aria-label="Restore from trash"
                    onClick={() => onRestore(item)}
                    className="text-white hover:bg-white/10"
                  >
                    <Icon name="restore_from_trash" size={20} />
                  </IconButton>
                </Tooltip>
              )}

              {onDeleteForever && (
                <Tooltip text="Delete permanently">
                  <IconButton
                    size="md"
                    aria-label="Delete permanently"
                    onClick={() => onDeleteForever(item)}
                    className="text-red-400 hover:text-red-300 hover:bg-white/10"
                  >
                    <Icon name="delete_forever" size={20} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              <Tooltip text={isStarred ? 'Remove from starred' : 'Add to starred'}>
                <IconButton
                  size="md"
                  aria-label="Star"
                  onClick={() => onToggleStar(item)}
                  className="text-white hover:bg-white/10"
                >
                  <Icon
                    name={isStarred ? 'star_filled' : 'star'}
                    size={20}
                    className={isStarred ? 'text-amber-400' : ''}
                  />
                </IconButton>
              </Tooltip>

              <Tooltip text="Move to trash">
                <IconButton
                  size="md"
                  aria-label="Move to trash"
                  onClick={() => onTrash(item)}
                  className="text-white hover:bg-white/10"
                >
                  <Icon name="trash" size={20} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Area with Touch/Mouse Gestures */}
      <div
        {...(bind() as any)}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4 touch-none"
      >
        {/* Left Arrow */}
        {currentIndex > 0 && (
          <button
            type="button"
            aria-label="Previous item"
            onClick={onPrev}
            className="absolute left-4 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
          >
            <Icon name="chevron_left" size={28} />
          </button>
        )}

        {/* Right Arrow */}
        {currentIndex !== -1 && currentIndex < allItems.length - 1 && (
          <button
            type="button"
            aria-label="Next item"
            onClick={onNext}
            className="absolute right-4 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
          >
            <Icon name="chevron_right" size={28} />
          </button>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-white/80">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90 animate-spin" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeDasharray="125.6"
                  strokeDashoffset="40"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-xs font-mono tracking-tight">{loadProgress}</p>
          </div>
        ) : meta.previewable && mediaUrl ? (
          meta.category === 'video' ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl"
            />
          ) : (
            <div
              className="relative cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                if (zoom > 1) {
                  setIsDragging(true);
                  dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && zoom > 1) {
                  setPan({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y
                  });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onDoubleClick={() => {
                setZoom((prev) => (prev > 1 ? 1 : 2));
                setPan({ x: 0, y: 0 });
              }}
            >
              <img
                src={mediaUrl}
                alt={item.name}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 150ms ease-out'
                }}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>
          )
        ) : (
          /* Non-previewable file fallback */
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 text-center max-w-sm">
            <Icon name={meta.icon} size={64} className={meta.color} />
            <div className="space-y-1">
              <h3 className="font-semibold text-base">{item.name}</h3>
              <p className="text-xs text-white/60">{formatBytes(item.size)}</p>
              <p className="text-xs text-white/40">Preview not available for this file type</p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-full bg-accent text-white font-medium text-sm hover:brightness-110 transition-colors shadow-md"
            >
              Download file
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar (Counter & Zoom) */}
      <div className="flex items-center justify-between h-14 px-6 bg-black/40 backdrop-blur-md border-t border-white/10 shrink-0">
        {/* Counter */}
        <div className="text-xs text-white/70 font-medium">
          {currentIndex !== -1 ? `${currentIndex + 1} of ${allItems.length}` : ''}
        </div>

        {/* Zoom Controls for Images */}
        {meta.category === 'image' && (
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-white/10">
            <IconButton
              size="sm"
              aria-label="Zoom out"
              onClick={() => {
                setZoom((z) => Math.max(0.5, z - 0.25));
                if (zoom <= 1.25) setPan({ x: 0, y: 0 });
              }}
              className="text-white hover:bg-white/10"
            >
              <Icon name="zoom_out" size={18} />
            </IconButton>
            <span className="text-xs font-mono min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
            <IconButton
              size="sm"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="text-white hover:bg-white/10"
            >
              <Icon name="zoom_in" size={18} />
            </IconButton>
          </div>
        )}

        <div className="w-16" />
      </div>
    </motion.div>
  );
};
