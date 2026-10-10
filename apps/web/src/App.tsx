import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  VaultHeader,
  ItemManifest,
  deriveSubkey,
  decryptManifest,
  encryptManifest,
  decryptChunk,
  hexToBytes,
  bytesToHex
} from '@televault/crypto';
import { downloadZip } from 'client-zip';
import { Shield, RefreshCw } from 'lucide-react';

import { api } from './api';
import { idb } from './db';
import { uploadManager, UploadQueueItem } from './upload/uploader';

import { LoginScreen } from './components/LoginScreen';
import { SetupWizard } from './components/SetupWizard';
import { UnlockScreen } from './components/UnlockScreen';
import { Header, FilterType } from './components/Header';
import { TimelineGrid } from './components/TimelineGrid';
import { LightboxViewer } from './components/LightboxViewer';
import { UploadQueueModal } from './components/UploadQueueModal';
import { SettingsModal } from './components/SettingsModal';

type AppState = 'loading' | 'login' | 'setup' | 'unlock' | 'unlocked';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [header, setHeader] = useState<VaultHeader | null>(null);
  const [headerRev, setHeaderRev] = useState<number>(1);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [manifestKey, setManifestKey] = useState<CryptoKey | null>(null);
  const [thumbKey, setThumbKey] = useState<CryptoKey | null>(null);

  // Library items & revisions
  const [items, setItems] = useState<ItemManifest[]>([]);
  const [itemRevs, setItemRevs] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxItem, setLightboxItem] = useState<ItemManifest | null>(null);

  // Modals & UI state
  const [isUploadQueueOpen, setIsUploadQueueOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('tv_autolock');
    return saved ? parseInt(saved, 10) : 15;
  });
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);

  // Activity timer ref for auto-lock
  const lastActivityRef = useRef<number>(Date.now());

  // 1. Initial Auth & Vault Check
  const checkVaultStatus = useCallback(async () => {
    try {
      const res = await api.getVault();
      if (res.status === 401) {
        setAppState('login');
        return;
      }
      if (res.status === 404 || !res.header) {
        setAppState('setup');
        return;
      }

      setHeader(res.header);
      if (res.rev) setHeaderRev(res.rev);

      // Check for remembered key in IndexedDB
      const remembered = await idb.getRememberedKey();
      if (remembered) {
        await activateKeys(remembered, res.header);
      } else {
        setAppState('unlock');
      }
    } catch {
      setAppState('login');
    }
  }, []);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  // 2. Activate keys & sync items
  const activateKeys = async (mKey: CryptoKey, vHeader?: VaultHeader) => {
    try {
      setMasterKey(mKey);
      if (vHeader) setHeader(vHeader);

      const mfk = await deriveSubkey(mKey, 'manifest');
      const thk = await deriveSubkey(mKey, 'thumb');
      setManifestKey(mfk);
      setThumbKey(thk);

      uploadManager.setMasterKey(mKey);

      // Load items
      await syncItems(mfk);
      setAppState('unlocked');
    } catch (err) {
      console.error('Failed to activate keys:', err);
      setAppState('unlock');
    }
  };

  const syncItems = async (mKey: CryptoKey) => {
    try {
      const res = await api.getItems(0, 1000);
      const decryptedItems: ItemManifest[] = [];
      const revs: Record<string, number> = {};

      for (const item of res.items) {
        try {
          const cipherBytes = hexToBytes(item.manifest);
          const manifest = await decryptManifest(
            mKey,
            hexToBytes(item.id),
            item.rev,
            cipherBytes
          );
          decryptedItems.push(manifest);
          revs[item.id] = item.rev;
        } catch (e) {
          console.error(`Failed to decrypt item ${item.id}:`, e);
        }
      }

      setItems(decryptedItems);
      setItemRevs(revs);
      uploadManager.setExistingHashes(new Set(decryptedItems.map((i) => i.sha256)));
    } catch (err) {
      console.error('Failed to sync items:', err);
    }
  };

  // 3. Upload Manager subscriptions & callbacks
  useEffect(() => {
    const unsubscribe = uploadManager.subscribe((q) => {
      setUploadQueue(q);
    });

    uploadManager.setOnItemCommitted((newManifest) => {
      setItems((prev) => [newManifest, ...prev]);
      setItemRevs((prev) => ({ ...prev, [newManifest.id]: 1 }));
      uploadManager.setExistingHashes(new Set([...items.map((i) => i.sha256), newManifest.sha256]));
    });

    return () => {
      unsubscribe();
    };
  }, [items]);

  // 4. Auto-lock Idle Timer
  useEffect(() => {
    if (appState !== 'unlocked' || autoLockMinutes <= 0) return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= autoLockMinutes * 60 * 1000) {
        handleLock();
      }
    }, 10_000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [appState, autoLockMinutes]);

  const handleLock = () => {
    setMasterKey(null);
    setManifestKey(null);
    setThumbKey(null);
    setSelectedIds(new Set());
    setLightboxItem(null);
    setIsUploadQueueOpen(false);
    setIsSettingsOpen(false);
    setAppState('unlock');
  };

  const handleLogout = async () => {
    await idb.clearRememberedKey();
    await api.logout();
    setMasterKey(null);
    setManifestKey(null);
    setThumbKey(null);
    setHeader(null);
    setItems([]);
    setAppState('login');
  };

  // 5. Filtered Items calculation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter tab
      if (activeFilter === 'trash') {
        if (!item.trashed) return false;
      } else {
        if (item.trashed) return false;
        if (activeFilter === 'photos' && !item.mime.startsWith('image/')) return false;
        if (activeFilter === 'videos' && !item.mime.startsWith('video/')) return false;
        if (activeFilter === 'favorites' && !item.favorite) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesMime = item.mime.toLowerCase().includes(q);
        if (!matchesName && !matchesMime) return false;
      }

      return true;
    });
  }, [items, activeFilter, searchQuery]);

  // 6. Selection & Bulk Operations
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkFavorite = async () => {
    if (!manifestKey) return;
    const targets = items.filter((i) => selectedIds.has(i.id));
    const allFav = targets.every((i) => i.favorite);
    const newFav = !allFav;

    for (const item of targets) {
      try {
        const currentRev = itemRevs[item.id] || 1;
        const nextRev = currentRev + 1;
        const updated: ItemManifest = { ...item, favorite: newFav };
        const cipher = await encryptManifest(
          manifestKey,
          hexToBytes(item.id),
          nextRev,
          updated
        );
        const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
        setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      } catch (err) {
        console.error(`Failed to update favorite for ${item.id}:`, err);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkTrash = async () => {
    if (!manifestKey) return;
    const targets = items.filter((i) => selectedIds.has(i.id));

    for (const item of targets) {
      try {
        const currentRev = itemRevs[item.id] || 1;
        const nextRev = currentRev + 1;
        const updated: ItemManifest = { ...item, trashed: true };
        const cipher = await encryptManifest(
          manifestKey,
          hexToBytes(item.id),
          nextRev,
          updated
        );
        const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
        setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      } catch (err) {
        console.error(`Failed to trash item ${item.id}:`, err);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkRestore = async () => {
    if (!manifestKey) return;
    const targets = items.filter((i) => selectedIds.has(i.id));

    for (const item of targets) {
      try {
        const currentRev = itemRevs[item.id] || 1;
        const nextRev = currentRev + 1;
        const updated: ItemManifest = { ...item, trashed: false };
        const cipher = await encryptManifest(
          manifestKey,
          hexToBytes(item.id),
          nextRev,
          updated
        );
        const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
        setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      } catch (err) {
        console.error(`Failed to restore item ${item.id}:`, err);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkDeleteForever = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.size} selected item(s)?\nChunks will be immediately purged from Telegram. This cannot be undone.`
    );
    if (!confirmed) return;

    for (const id of Array.from(selectedIds)) {
      try {
        await api.deleteItem(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        setItemRevs((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      } catch (err) {
        console.error(`Failed to delete item ${id}:`, err);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkDownloadZip = async () => {
    if (!masterKey || selectedIds.size === 0) return;
    setIsDownloadingZip(true);
    setZipProgress(`Preparing ${selectedIds.size} item(s)...`);

    try {
      const targets = items.filter((i) => selectedIds.has(i.id));
      const zipFiles: Array<{ name: string; input: Uint8Array; lastModified: Date }> = [];

      let currentItemIdx = 0;
      for (const item of targets) {
        currentItemIdx++;
        setZipProgress(`Downloading ${currentItemIdx}/${targets.length}: ${item.name}`);

        const fileKey = await deriveSubkey(masterKey, `file/${item.id}`);
        const fileIdBytes = hexToBytes(item.id);
        const totalChunks = item.chunks.length;
        const decryptedChunks: Uint8Array[] = [];
        let totalBytes = 0;

        for (let idx = 0; idx < totalChunks; idx++) {
          const c = item.chunks[idx];
          const cipherBytes = await api.downloadChunk(c.fileId);
          const plainBytes = await decryptChunk(
            fileKey,
            fileIdBytes,
            idx,
            totalChunks,
            cipherBytes
          );
          decryptedChunks.push(plainBytes);
          totalBytes += plainBytes.byteLength;
        }

        const fullBuffer = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of decryptedChunks) {
          fullBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }

        zipFiles.push({
          name: item.name,
          input: fullBuffer,
          lastModified: new Date(item.takenAt || item.uploadedAt)
        });
      }

      setZipProgress('Creating ZIP archive...');
      const zipResponse = downloadZip(zipFiles);
      const zipBlob = await zipResponse.blob();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `televault-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSelectedIds(new Set());
    } catch (err: any) {
      alert(`ZIP Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloadingZip(false);
      setZipProgress(null);
    }
  };

  // 7. Lightbox item next / prev
  const handleLightboxNext = () => {
    if (!lightboxItem) return;
    const idx = filteredItems.findIndex((i) => i.id === lightboxItem.id);
    if (idx !== -1 && idx < filteredItems.length - 1) {
      setLightboxItem(filteredItems[idx + 1]);
    }
  };

  const handleLightboxPrev = () => {
    if (!lightboxItem) return;
    const idx = filteredItems.findIndex((i) => i.id === lightboxItem.id);
    if (idx > 0) {
      setLightboxItem(filteredItems[idx - 1]);
    }
  };

  const handleToggleLightboxFavorite = async (item: ItemManifest) => {
    if (!manifestKey) return;
    const currentRev = itemRevs[item.id] || 1;
    const nextRev = currentRev + 1;
    const updated: ItemManifest = { ...item, favorite: !item.favorite };
    try {
      const cipher = await encryptManifest(
        manifestKey,
        hexToBytes(item.id),
        nextRev,
        updated
      );
      const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
      setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setLightboxItem(updated);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleToggleLightboxTrash = async (item: ItemManifest) => {
    if (!manifestKey) return;
    const currentRev = itemRevs[item.id] || 1;
    const nextRev = currentRev + 1;
    const updated: ItemManifest = { ...item, trashed: !item.trashed };
    try {
      const cipher = await encryptManifest(
        manifestKey,
        hexToBytes(item.id),
        nextRev,
        updated
      );
      const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
      setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setLightboxItem(null);
    } catch (err) {
      console.error('Failed to toggle trash:', err);
    }
  };

  // 8. Render Views based on AppState
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Connecting to TeleVault...</span>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={checkVaultStatus} />;
  }

  if (appState === 'setup') {
    return (
      <SetupWizard
        onSetupComplete={(newMasterKey, newHeader) => {
          activateKeys(newMasterKey, newHeader);
        }}
      />
    );
  }

  if (appState === 'unlock') {
    return (
      <UnlockScreen
        header={header!}
        onUnlockSuccess={(unlockedMasterKey) => {
          activateKeys(unlockedMasterKey, header!);
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header & Controls */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        onBulkFavorite={handleBulkFavorite}
        onBulkTrash={handleBulkTrash}
        onBulkRestore={handleBulkRestore}
        onBulkDeleteForever={handleBulkDeleteForever}
        onBulkDownloadZip={handleBulkDownloadZip}
        uploadQueue={uploadQueue}
        onOpenUploadQueue={() => setIsUploadQueueOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLock={handleLock}
        onFilesSelected={(files) => uploadManager.enqueueFiles(files)}
      />

      {/* Main Content: Timeline Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TimelineGrid
          items={filteredItems}
          thumbKey={thumbKey}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onItemClick={(item) => setLightboxItem(item)}
          onDropFiles={(files) => uploadManager.enqueueFiles(files)}
          filterLabel={
            activeFilter === 'trash'
              ? 'Trash'
              : activeFilter === 'favorites'
              ? 'Favorites'
              : activeFilter === 'photos'
              ? 'Photos'
              : activeFilter === 'videos'
              ? 'Videos'
              : 'All Media'
          }
        />
      </main>

      {/* Lightbox Modal */}
      {lightboxItem && masterKey && (
        <LightboxViewer
          item={lightboxItem}
          masterKey={masterKey}
          onClose={() => setLightboxItem(null)}
          onNext={handleLightboxNext}
          onPrev={handleLightboxPrev}
          onToggleFavorite={handleToggleLightboxFavorite}
          onToggleTrash={handleToggleLightboxTrash}
        />
      )}

      {/* Upload Queue Modal */}
      {isUploadQueueOpen && (
        <UploadQueueModal
          queue={uploadQueue}
          onClose={() => setIsUploadQueueOpen(false)}
          onPause={(id) => uploadManager.pause(id)}
          onResume={(id) => uploadManager.resume(id)}
          onCancel={(id) => uploadManager.cancel(id)}
          onClearDone={() => uploadManager.clearFinished()}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && header && masterKey && (
        <SettingsModal
          header={header}
          masterKey={masterKey}
          onClose={() => setIsSettingsOpen(false)}
          onLock={handleLock}
          onLogout={handleLogout}
          autoLockMinutes={autoLockMinutes}
          onSetAutoLockMinutes={(mins) => {
            setAutoLockMinutes(mins);
            localStorage.setItem('tv_autolock', mins.toString());
          }}
          onVaultUpdated={(newHeader) => {
            setHeader(newHeader);
            setHeaderRev(newHeader.rev);
          }}
        />
      )}

      {/* ZIP Download Progress Overlay */}
      {isDownloadingZip && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Exporting Archive</h3>
            <p className="text-xs text-gray-400 font-mono">{zipProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
};
