import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Trash2,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  ItemManifest,
  deriveSubkey,
  decryptChunk,
  hexToBytes,
  sha256Digest
} from '@televault/crypto';
import { api } from '../api';

interface LightboxViewerProps {
  item: ItemManifest;
  masterKey: CryptoKey;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onToggleFavorite: (item: ItemManifest) => void;
  onToggleTrash: (item: ItemManifest) => void;
}

export const LightboxViewer: React.FC<LightboxViewerProps> = ({
  item,
  masterKey,
  onClose,
  onNext,
  onPrev,
  onToggleFavorite,
  onToggleTrash
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hashVerified, setHashVerified] = useState(false);

  const isVideo = item.mime.startsWith('video/');

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Decrypt and load original file chunks
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setDownloadProgress(0);
    setError(null);
    setBlobUrl(null);
    setZoom(1);
    setHashVerified(false);

    const loadOriginal = async () => {
      try {
        const fileKey = await deriveSubkey(masterKey, `file/${item.id}`);
        const totalChunks = item.chunks.length;
        const decryptedBuffers: Uint8Array[] = [];

        for (let i = 0; i < totalChunks; i++) {
          if (isCancelled) return;
          const chunkInfo = item.chunks[i];

          // 1. Download encrypted chunk
          const encryptedBytes = await api.downloadChunk(chunkInfo.fileId);

          // 2. Decrypt chunk
          const plainBytes = await decryptChunk(
            fileKey,
            hexToBytes(item.id),
            i,
            totalChunks,
            encryptedBytes
          );

          decryptedBuffers.push(plainBytes);
          setDownloadProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        if (isCancelled) return;

        // 3. Assemble complete file
        const fullBlob = new Blob(decryptedBuffers as BlobPart[], { type: item.mime });

        // 4. Verify SHA-256
        const fullBuf = await fullBlob.arrayBuffer();
        const calculatedHash = await sha256Digest(new Uint8Array(fullBuf));
        if (calculatedHash === item.sha256) {
          setHashVerified(true);
        }

        const url = URL.createObjectURL(fullBlob);
        setBlobUrl(url);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to download or decrypt media');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadOriginal();

    return () => {
      isCancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [item.id, masterKey]);

  // Download original file to device
  const handleDownloadFile = async () => {
    if (!blobUrl) return;

    // Use showSaveFilePicker if available (Chromium)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: item.name
        });
        const writable = await handle.createWritable();
        const res = await fetch(blobUrl);
        await res.body?.pipeTo(writable);
        return;
      } catch (err: any) {
        // Fall back to standard anchor download on any error or rejection
      }
    }

    // Standard fallback download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="truncate max-w-xs sm:max-w-md">
            <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
            <p className="text-[11px] text-gray-400">
              {(item.size / 1024 / 1024).toFixed(2)} MB &bull; {new Date(item.takenAt || item.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hashVerified && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SHA-256 Verified</span>
            </div>
          )}

          {!isVideo && blobUrl && (
            <div className="flex items-center gap-1 bg-gray-900/60 rounded-xl p-1 border border-gray-800">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => onToggleFavorite(item)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              item.favorite
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-gray-900/60 hover:bg-gray-800 text-gray-300'
            }`}
            title="Favorite"
          >
            <Star className={`w-5 h-5 ${item.favorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => onToggleTrash(item)}
            className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-red-400 transition cursor-pointer"
            title="Trash"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleDownloadFile}
            disabled={!blobUrl}
            className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-emerald-400 disabled:opacity-40 transition cursor-pointer"
            title="Download Original"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              showInfo
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-900/60 hover:bg-gray-800 text-gray-300'
            }`}
            title="File Information"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs">
              Fetching &amp; decrypting chunks ({downloadProgress}%)...
            </p>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-400 text-center max-w-md">
            <p className="text-sm font-semibold mb-1">Decryption Error</p>
            <p className="text-xs mb-4">{error}</p>
          </div>
        )}

        {!loading && !error && blobUrl && (
          <>
            {isVideo ? (
              <video
                src={blobUrl}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              <div
                style={{ transform: `scale(${zoom})` }}
                className="transition-transform duration-200 max-h-full max-w-full flex items-center justify-center"
              >
                <img
                  src={blobUrl}
                  alt={item.name}
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}
          </>
        )}

        {/* Next / Prev Navigation Chevrons */}
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition backdrop-blur-sm cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition backdrop-blur-sm cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Info Drawer */}
      {showInfo && (
        <div className="absolute top-16 right-4 w-80 bg-gray-900/95 border border-gray-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md z-20 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h4 className="font-semibold text-white">Details</h4>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-gray-300">
            <div>
              <span className="text-gray-500 block">Name:</span>
              <span className="break-all font-mono text-gray-200">{item.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Size:</span>
              <span>{(item.size / 1024 / 1024).toFixed(2)} MB ({item.size.toLocaleString()} bytes)</span>
            </div>
            <div>
              <span className="text-gray-500 block">MIME Type:</span>
              <span>{item.mime}</span>
            </div>
            {item.width && item.height && (
              <div>
                <span className="text-gray-500 block">Dimensions:</span>
                <span>{item.width} &times; {item.height} px</span>
              </div>
            )}
            {item.durationMs && (
              <div>
                <span className="text-gray-500 block">Duration:</span>
                <span>{(item.durationMs / 1000).toFixed(1)} seconds</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block">Date Taken:</span>
              <span>{new Date(item.takenAt || item.uploadedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Chunks:</span>
              <span>{item.chunks.length} encrypted Telegram document(s)</span>
            </div>
            <div>
              <span className="text-gray-500 block">SHA-256 Digest:</span>
              <span className="font-mono text-[10px] break-all text-gray-400">{item.sha256}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
