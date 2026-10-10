import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  VaultHeader,
  ItemManifest,
  deriveSubkey,
  decryptManifest,
  encryptManifest,
  hexToBytes,
  bytesToHex
} from '@televault/crypto';

import { api } from './api';
import { idb } from './db';
import { uploadManager, UploadQueueItem } from './upload/uploader';
import { uploadFilesWithStructure, scanDataTransferItems } from './upload/folderUpload';
import { exportItemsAsZip } from './utils/zipExport';
import {
  getBreadcrumbs,
  getFolderContents,
  getDescendantIds,
  getUniqueName
} from './utils/folderTree';

import { LoginScreen } from './components/LoginScreen';
import { SetupWizard } from './components/SetupWizard';
import { UnlockScreen } from './components/UnlockScreen';
import { DriveHeader } from './components/DriveHeader';
import { DriveSidebar, NavRoute } from './components/DriveSidebar';
import { DriveMainView } from './components/DriveMainView';
import { TimelineGrid } from './components/TimelineGrid';
import { DriveDetailsPanel } from './components/DriveDetailsPanel';
import { DrivePreview } from './components/DrivePreview';
import { DriveUploadCard } from './components/DriveUploadCard';
import { SettingsModal } from './components/SettingsModal';
import {
  RenameDialog,
  NewFolderDialog,
  MoveDialog,
  ConfirmDeleteDialog
} from './components/DriveDialogs';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Showcase } from './components/ui/Showcase';
import { Snackbar } from './components/ui/Snackbar';
import { FilterCategory, FilterModified } from './components/DriveFilterChips';
import { Icon } from './components/ui/Icon';

type AppState = 'loading' | 'login' | 'setup' | 'unlock' | 'unlocked';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [header, setHeader] = useState<VaultHeader | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [manifestKey, setManifestKey] = useState<CryptoKey | null>(null);
  const [thumbKey, setThumbKey] = useState<CryptoKey | null>(null);

  // Library items & revisions
  const [items, setItems] = useState<ItemManifest[]>([]);
  const [itemRevs, setItemRevs] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Routing state
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [modifiedFilter, setModifiedFilter] = useState<FilterModified>('all');

  // Modals & Panels
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<ItemManifest | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dialogs state
  const [renameTarget, setRenameTarget] = useState<ItemManifest | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<ItemManifest[] | null>(null);
  const [confirmDeleteTargets, setConfirmDeleteTargets] = useState<{
    items: ItemManifest[];
    isEmptyTrash?: boolean;
  } | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    message: string;
    isOpen: boolean;
    actionLabel?: string;
    onAction?: () => void;
  }>({ message: '', isOpen: false });

  // Upload & Export state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [zipProgress, setZipProgress] = useState<string | null>(null);

  // Hidden File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('tv_theme') as any) || 'light';
  });

  // Auto-lock idle timer
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('tv_autolock');
    return saved ? parseInt(saved, 10) : 15;
  });
  const lastActivityRef = useRef<number>(Date.now());

  // 1. Theme handler
  useEffect(() => {
    localStorage.setItem('tv_theme', theme);
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 2. Hash Routing synchronization
  const parseHash = useCallback(() => {
    const hash = window.location.hash || '#/drive';
    if (hash === '#/photos') {
      setCurrentRoute('photos');
      setCurrentFolderId(null);
    } else if (hash === '#/recent') {
      setCurrentRoute('recent');
      setCurrentFolderId(null);
    } else if (hash === '#/starred') {
      setCurrentRoute('starred');
      setCurrentFolderId(null);
    } else if (hash === '#/trash') {
      setCurrentRoute('trash');
      setCurrentFolderId(null);
    } else if (hash.startsWith('#/drive/')) {
      setCurrentRoute('drive');
      setCurrentFolderId(hash.replace('#/drive/', ''));
    } else if (hash.startsWith('#/search?q=')) {
      const q = decodeURIComponent(hash.replace('#/search?q=', ''));
      setSearchQuery(q);
      setCurrentRoute('drive');
    } else if (hash === '#/showcase') {
      setIsShowcaseOpen(true);
    } else {
      setCurrentRoute('drive');
      setCurrentFolderId(null);
    }
  }, []);

  useEffect(() => {
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, [parseHash]);

  const updateRoute = (route: NavRoute, folderId: string | null = null) => {
    setSelectedIds(new Set());
    if (route === 'drive') {
      window.location.hash = folderId ? `#/drive/${folderId}` : '#/drive';
    } else {
      window.location.hash = `#/${route}`;
    }
  };

  // 3. Initial Auth & Vault Check
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

  // 4. Activate keys & sync items
  const activateKeys = async (mKey: CryptoKey, vHeader?: VaultHeader) => {
    try {
      setMasterKey(mKey);
      if (vHeader) setHeader(vHeader);

      const mfk = await deriveSubkey(mKey, 'manifest');
      const thk = await deriveSubkey(mKey, 'thumb');
      setManifestKey(mfk);
      setThumbKey(thk);

      uploadManager.setMasterKey(mKey);
      await syncItems(mfk);
      setAppState('unlocked');
    } catch (err) {
      console.error('Failed to activate keys:', err);
      setAppState('unlock');
    }
  };

  const syncItems = async (mfk: CryptoKey) => {
    try {
      const res = await api.getItems(0, 1000);
      const decryptedItems: ItemManifest[] = [];
      const revs: Record<string, number> = {};
      let totalBytes = 0;

      for (const item of res.items) {
        try {
          const cipherBytes = hexToBytes(item.manifest);
          const manifest = await decryptManifest(
            mfk,
            hexToBytes(item.id),
            item.rev,
            cipherBytes
          );
          decryptedItems.push(manifest);
          revs[item.id] = item.rev;
          totalBytes += manifest.size || 0;
        } catch (e) {
          console.error(`Failed to decrypt item ${item.id}:`, e);
        }
      }

      setItems(decryptedItems);
      setItemRevs(revs);
      setUsedBytes(totalBytes);
      uploadManager.setExistingHashes(new Set(decryptedItems.map((i) => i.sha256).filter(Boolean)));
    } catch (err) {
      console.error('Failed to sync items:', err);
    }
  };

  // 5. Upload Manager subscriptions & callbacks
  useEffect(() => {
    const unsubscribe = uploadManager.subscribe((q) => {
      setUploadQueue(q);
    });

    uploadManager.setOnItemCommitted((newManifest) => {
      setItems((prev) => [newManifest, ...prev]);
      setItemRevs((prev) => ({ ...prev, [newManifest.id]: 1 }));
      setUsedBytes((prev) => prev + (newManifest.size || 0));
      uploadManager.setExistingHashes(
        new Set([...items.map((i) => i.sha256).filter(Boolean), newManifest.sha256])
      );
    });

    return () => {
      unsubscribe();
    };
  }, [items]);

  // 6. Auto-lock Idle Timer
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
    setPreviewItem(null);
    setIsDetailsOpen(false);
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

  // 7. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key === 'Escape') {
        setSelectedIds(new Set());
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && currentRoute !== 'trash') {
          const targets = items.filter((i) => selectedIds.has(i.id));
          handleTrashItems(targets);
        }
      } else if (e.key === 'F2') {
        if (selectedIds.size === 1) {
          const target = items.find((i) => selectedIds.has(i.id));
          if (target) setRenameTarget(target);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (selectedIds.size === 1) {
          e.preventDefault();
          const target = items.find((i) => selectedIds.has(i.id));
          if (target) {
            if (target.kind === 'folder') {
              updateRoute('drive', target.id);
            } else {
              setPreviewItem(target);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIds, currentRoute]);

  // 8. Navigation & Breadcrumb derivation
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return items.find((i) => i.id === currentFolderId && i.kind === 'folder') || null;
  }, [items, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbs(items, currentFolderId);
  }, [items, currentFolderId]);

  // 9. Filtered Items Calculation
  const filteredViewItems = useMemo(() => {
    let result = items;

    // Filter by Route
    if (currentRoute === 'trash') {
      result = result.filter((i) => i.trashed);
    } else {
      result = result.filter((i) => !i.trashed);

      if (currentRoute === 'starred') {
        result = result.filter((i) => i.starred || i.favorite);
      } else if (currentRoute === 'recent') {
        // Last 30 days or up to 200 items, sorted by uploadedAt descending
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        result = result
          .filter((i) => new Date(i.uploadedAt).getTime() >= cutoff)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 200);
      } else if (currentRoute === 'photos') {
        // Photos view shows all images and videos regardless of folder
        result = result.filter((i) => i.kind !== 'folder' && (i.mime.startsWith('image/') || i.mime.startsWith('video/')));
      } else if (currentRoute === 'drive') {
        // Only items in current folder unless searching
        if (!searchQuery.trim()) {
          result = result.filter((i) => (i.parentId ?? null) === currentFolderId);
        }
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    // Filter by Category Chip
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'folders') result = result.filter((i) => i.kind === 'folder');
      if (categoryFilter === 'images') result = result.filter((i) => i.kind !== 'folder' && i.mime.startsWith('image/'));
      if (categoryFilter === 'videos') result = result.filter((i) => i.kind !== 'folder' && i.mime.startsWith('video/'));
      if (categoryFilter === 'pdfs') result = result.filter((i) => i.kind !== 'folder' && i.mime === 'application/pdf');
      if (categoryFilter === 'audio') result = result.filter((i) => i.kind !== 'folder' && i.mime.startsWith('audio/'));
      if (categoryFilter === 'archives') {
        result = result.filter(
          (i) => i.kind !== 'folder' && (i.mime.includes('zip') || i.mime.includes('compressed') || i.name.endsWith('.zip'))
        );
      }
      if (categoryFilter === 'docs') {
        result = result.filter(
          (i) => i.kind !== 'folder' && (i.mime.includes('text') || i.mime.includes('document') || i.name.endsWith('.pdf'))
        );
      }
    }

    // Filter by Modified Date Chip
    if (modifiedFilter !== 'all') {
      const now = Date.now();
      let limitMs = 0;
      if (modifiedFilter === 'today') limitMs = 24 * 60 * 60 * 1000;
      if (modifiedFilter === '7days') limitMs = 7 * 24 * 60 * 60 * 1000;
      if (modifiedFilter === '30days') limitMs = 30 * 24 * 60 * 60 * 1000;
      if (modifiedFilter === 'this_year') limitMs = 365 * 24 * 60 * 60 * 1000;

      if (limitMs > 0) {
        result = result.filter((i) => now - new Date(i.uploadedAt).getTime() <= limitMs);
      }
    }

    return result;
  }, [items, currentRoute, currentFolderId, searchQuery, categoryFilter, modifiedFilter]);

  // Partition into folders and files
  const viewFolders = useMemo(() => {
    return filteredViewItems.filter((i) => i.kind === 'folder');
  }, [filteredViewItems]);

  const viewFiles = useMemo(() => {
    return filteredViewItems.filter((i) => i.kind !== 'folder');
  }, [filteredViewItems]);

  // 10. Selection Handlers
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e?.ctrlKey || e?.metaKey) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (e?.shiftKey && prev.size > 0) {
        const allList = [...viewFolders, ...viewFiles];
        const lastSelected = Array.from(prev).pop()!;
        const idxA = allList.findIndex((i) => i.id === lastSelected);
        const idxB = allList.findIndex((i) => i.id === id);
        if (idxA !== -1 && idxB !== -1) {
          const start = Math.min(idxA, idxB);
          const end = Math.max(idxA, idxB);
          for (let i = start; i <= end; i++) {
            next.add(allList[i].id);
          }
        } else {
          next.add(id);
        }
      } else {
        if (next.has(id) && next.size === 1) {
          next.delete(id);
        } else {
          next.clear();
          next.add(id);
        }
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = [...viewFolders, ...viewFiles];
    setSelectedIds(new Set(all.map((i) => i.id)));
  };

  // 11. Folder Operations
  const handleCreateFolder = async (name: string, targetParentId: string | null = currentFolderId) => {
    if (!manifestKey) return null;
    try {
      const newFolderId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const folderManifest: ItemManifest = {
        v: 2,
        id: newFolderId,
        kind: 'folder',
        parentId: targetParentId,
        name,
        mime: 'application/x-directory',
        size: 0,
        sha256: '',
        chunkSize: 0,
        chunks: [],
        takenAt: null,
        uploadedAt: new Date().toISOString(),
        width: null,
        height: null,
        durationMs: null,
        starred: false,
        favorite: false,
        trashed: false,
        albumIds: []
      };

      const cipher = await encryptManifest(
        manifestKey,
        hexToBytes(newFolderId),
        1,
        folderManifest
      );

      await api.commitItem({
        id: newFolderId,
        manifest: bytesToHex(cipher),
        chunks: [],
        sizeBytes: 0,
        chunkCount: 0
      });

      setItems((prev) => [folderManifest, ...prev]);
      setItemRevs((prev) => ({ ...prev, [newFolderId]: 1 }));
      setSnackbar({
        message: `Created folder "${name}"`,
        isOpen: true
      });
      return newFolderId;
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert('Failed to create folder');
      return null;
    }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!manifestKey || !renameTarget) return;
    try {
      const currentRev = itemRevs[renameTarget.id] || 1;
      const nextRev = currentRev + 1;
      const updated: ItemManifest = { ...renameTarget, name: newName };

      const cipher = await encryptManifest(
        manifestKey,
        hexToBytes(renameTarget.id),
        nextRev,
        updated
      );

      const res = await api.updateItem(renameTarget.id, bytesToHex(cipher), currentRev);
      setItemRevs((prev) => ({ ...prev, [renameTarget.id]: res.rev }));
      setItems((prev) => prev.map((i) => (i.id === renameTarget.id ? updated : i)));
      setSnackbar({
        message: `Renamed to "${newName}"`,
        isOpen: true
      });
    } catch (err) {
      console.error('Rename failed:', err);
      alert('Failed to rename item');
    } finally {
      setRenameTarget(null);
    }
  };

  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (!manifestKey || !moveTargets || moveTargets.length === 0) return;
    const targetName =
      targetFolderId === null
        ? 'My Drive'
        : items.find((i) => i.id === targetFolderId)?.name || 'folder';

    try {
      for (const item of moveTargets) {
        const currentRev = itemRevs[item.id] || 1;
        const nextRev = currentRev + 1;
        const updated: ItemManifest = { ...item, parentId: targetFolderId };

        const cipher = await encryptManifest(
          manifestKey,
          hexToBytes(item.id),
          nextRev,
          updated
        );

        const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
        setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      }

      setSelectedIds(new Set());
      setSnackbar({
        message: `Moved ${moveTargets.length} item(s) to "${targetName}"`,
        isOpen: true
      });
    } catch (err) {
      console.error('Move failed:', err);
      alert('Failed to move items');
    } finally {
      setMoveTargets(null);
    }
  };

  const handleToggleStarItems = async (targets: ItemManifest[]) => {
    if (!manifestKey || targets.length === 0) return;
    const allStarred = targets.every((i) => i.starred || i.favorite);
    const nextStar = !allStarred;

    try {
      for (const item of targets) {
        const currentRev = itemRevs[item.id] || 1;
        const nextRev = currentRev + 1;
        const updated: ItemManifest = {
          ...item,
          starred: nextStar,
          favorite: nextStar
        };

        const cipher = await encryptManifest(
          manifestKey,
          hexToBytes(item.id),
          nextRev,
          updated
        );

        const res = await api.updateItem(item.id, bytesToHex(cipher), currentRev);
        setItemRevs((prev) => ({ ...prev, [item.id]: res.rev }));
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      }

      setSnackbar({
        message: nextStar ? 'Added to Starred' : 'Removed from Starred',
        isOpen: true
      });
    } catch (err) {
      console.error('Toggle star failed:', err);
    }
  };

  const handleTrashItems = async (targets: ItemManifest[]) => {
    if (!manifestKey || targets.length === 0) return;

    // Gather all target items plus all their recursive descendants
    const idsToTrash = new Set<string>();
    for (const t of targets) {
      idsToTrash.add(t.id);
      if (t.kind === 'folder') {
        const desc = getDescendantIds(items, t.id);
        desc.forEach((d) => idsToTrash.add(d));
      }
    }

    const itemsToUpdate = items.filter((i) => idsToTrash.has(i.id) && !i.trashed);

    try {
      for (const item of itemsToUpdate) {
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
      }

      setSelectedIds(new Set());
      setSnackbar({
        message: `${targets.length} item(s) moved to trash`,
        isOpen: true,
        actionLabel: 'Undo',
        onAction: () => handleRestoreItems(targets)
      });
    } catch (err) {
      console.error('Trash items failed:', err);
      alert('Failed to move items to trash');
    }
  };

  const handleRestoreItems = async (targets: ItemManifest[]) => {
    if (!manifestKey || targets.length === 0) return;

    const idsToRestore = new Set<string>();
    for (const t of targets) {
      idsToRestore.add(t.id);
      if (t.kind === 'folder') {
        const desc = getDescendantIds(items, t.id);
        desc.forEach((d) => idsToRestore.add(d));
      }
    }

    const itemsToUpdate = items.filter((i) => idsToRestore.has(i.id) && i.trashed);

    try {
      for (const item of itemsToUpdate) {
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
      }

      setSelectedIds(new Set());
      setSnackbar({
        message: `${targets.length} item(s) restored`,
        isOpen: true
      });
    } catch (err) {
      console.error('Restore items failed:', err);
    }
  };

  const handleDeleteForeverConfirm = async (targets: ItemManifest[]) => {
    const idsToDelete = new Set<string>();
    for (const t of targets) {
      idsToDelete.add(t.id);
      if (t.kind === 'folder') {
        const desc = getDescendantIds(items, t.id);
        desc.forEach((d) => idsToDelete.add(d));
      }
    }

    // Delete leaves first, then parents
    const toDelete = items.filter((i) => idsToDelete.has(i.id));
    if (toDelete.length === 0) {
      setConfirmDeleteTargets(null);
      return;
    }

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: toDelete.length });

    try {
      for (let i = 0; i < toDelete.length; i++) {
        await api.deleteItem(toDelete[i].id);
        setDeleteProgress({ current: i + 1, total: toDelete.length });
        setItems((prev) => prev.filter((item) => item.id !== toDelete[i].id));
      }

      setSelectedIds(new Set());
      setSnackbar({
        message: `${targets.length} item(s) permanently deleted`,
        isOpen: true
      });
    } catch (err) {
      console.error('Delete forever failed:', err);
      alert('Failed to delete items');
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
      setConfirmDeleteTargets(null);
    }
  };

  // 12. Bulk ZIP Export
  const handleBulkDownloadZip = async () => {
    if (!masterKey) return;
    const targets =
      selectedIds.size > 0
        ? items.filter((i) => selectedIds.has(i.id))
        : currentFolder
        ? [currentFolder]
        : [];

    if (targets.length === 0) return;

    try {
      setZipProgress(`Preparing export...`);
      const blob = await exportItemsAsZip({
        targets,
        allItems: items,
        masterKey,
        onProgress: (p) => {
          setZipProgress(`${p.currentName} (${p.current}/${p.total})`);
        }
      });

      const url = URL.createObjectURL(blob);
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
      setZipProgress(null);
    }
  };

  // 13. Drag & Drop Upload
  const handleDropFiles = async (droppedFiles: FileList | File[]) => {
    if (!manifestKey) return;

    const fileArray = Array.from(droppedFiles);
    // Check if any file has relative path (webkitdirectory or folder drop)
    const hasRelativePaths = fileArray.some((f) => (f as any).webkitRelativePath);

    if (hasRelativePaths) {
      const filesWithPaths = fileArray.map((f) => ({
        file: f,
        relativePath: (f as any).webkitRelativePath || f.name
      }));
      await uploadFilesWithStructure({
        filesWithPaths,
        rootParentId: currentFolderId,
        allItems: items,
        manifestKey,
        onFolderCreated: (newFolder) => {
          setItems((prev) => [newFolder, ...prev]);
          setItemRevs((prev) => ({ ...prev, [newFolder.id]: 1 }));
        }
      });
    } else {
      const existingInFolder = getFolderContents(items, currentFolderId).files.map((f) => f.name);
      uploadManager.enqueueFiles(fileArray, currentFolderId, existingInFolder);
    }
  };

  // 14. Render Views based on AppState
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-text-secondary">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
            <Icon name="shield" size={32} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon name="refresh" size={16} className="animate-spin text-accent" />
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
    <div className="flex flex-col h-screen w-screen bg-page text-text-primary overflow-hidden font-sans">
      {/* 1. Header (64px) */}
      <DriveHeader
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim()) window.location.hash = `#/search?q=${encodeURIComponent(q.trim())}`;
          else if (currentRoute === 'drive') window.location.hash = currentFolderId ? `#/drive/${currentFolderId}` : '#/drive';
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLock={handleLock}
        onLogout={handleLogout}
        currentTheme={theme}
        onThemeChange={setTheme}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* 2. Middle Body: Sidebar + Main Panel + Details Panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar (256px on desktop) */}
        <DriveSidebar
          currentRoute={currentRoute}
          onRouteChange={(r) => updateRoute(r)}
          onNewFolder={() => setIsNewFolderOpen(true)}
          onUploadFiles={() => fileInputRef.current?.click()}
          onUploadPhotos={() => mediaInputRef.current?.click()}
          onUploadFolder={() => folderInputRef.current?.click()}
          usedBytes={usedBytes}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Panel with 16px right/bottom margin (plus mobile bottom padding for nav bar) */}
        <main className="flex-1 flex flex-col min-w-0 mr-0 sm:mr-4 mb-0 sm:mb-4 pb-20 md:pb-0 overflow-hidden">
          {currentRoute === 'photos' ? (
            <TimelineGrid
              items={filteredViewItems}
              thumbKey={thumbKey}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onItemClick={(item) => setPreviewItem(item)}
              onDropFiles={handleDropFiles}
              filterLabel="Photos"
            />
          ) : (
            <DriveMainView
              currentRoute={currentRoute}
              currentFolder={currentFolder}
              breadcrumbs={breadcrumbs}
              folders={viewFolders}
              files={viewFiles}
              allItems={items}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={() => setSelectedIds(new Set())}
              onNavigateFolder={(fId) => updateRoute('drive', fId)}
              onOpenFile={(file) => setPreviewItem(file)}
              onDownloadItem={(item) => exportItemsAsZip({ targets: [item], allItems: items, masterKey: masterKey! })}
              onBulkDownloadZip={handleBulkDownloadZip}
              onRenameItem={(item) => setRenameTarget(item)}
              onMoveItems={(targets) => setMoveTargets(targets)}
              onToggleStarItems={handleToggleStarItems}
              onTrashItems={handleTrashItems}
              onRestoreItems={handleRestoreItems}
              onDeleteForeverItems={(targets) => setConfirmDeleteTargets({ items: targets })}
              onEmptyTrash={() => setConfirmDeleteTargets({ items: viewFiles, isEmptyTrash: true })}
              thumbKey={thumbKey}
              isDetailsOpen={isDetailsOpen}
              onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
              onOpenNewFolderDialog={() => setIsNewFolderOpen(true)}
              onTriggerFileUpload={() => fileInputRef.current?.click()}
              onTriggerFolderUpload={() => folderInputRef.current?.click()}
              onDropFilesToUpload={handleDropFiles}
              onDropMoveToFolder={(targetFolderId, droppedIds) => {
                const targets = items.filter((i) => droppedIds.includes(i.id));
                setMoveTargets(targets);
                handleMoveConfirm(targetFolderId);
              }}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              modifiedFilter={modifiedFilter}
              onModifiedFilterChange={setModifiedFilter}
              searchQuery={searchQuery}
            />
          )}
        </main>

        {/* Details Panel (360px on right on desktop, modal drawer on mobile) */}
        {isDetailsOpen && (
          <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto bg-black/40 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none flex justify-end md:mr-4 md:mb-4">
            <DriveDetailsPanel
              isOpen={isDetailsOpen}
              onClose={() => setIsDetailsOpen(false)}
              selectedItems={items.filter((i) => selectedIds.has(i.id))}
              currentFolder={currentFolder}
              allItems={items}
              thumbKey={thumbKey}
            />
          </div>
        )}
      </div>

      {/* 3. Full-Screen Preview Viewer */}
      {previewItem && masterKey && (
        <DrivePreview
          item={previewItem}
          allItems={viewFiles}
          masterKey={masterKey}
          onClose={() => setPreviewItem(null)}
          onNext={() => {
            const idx = viewFiles.findIndex((i) => i.id === previewItem.id);
            if (idx !== -1 && idx < viewFiles.length - 1) setPreviewItem(viewFiles[idx + 1]);
          }}
          onPrev={() => {
            const idx = viewFiles.findIndex((i) => i.id === previewItem.id);
            if (idx > 0) setPreviewItem(viewFiles[idx - 1]);
          }}
          onToggleStar={(it) => handleToggleStarItems([it])}
          onTrash={(it) => {
            handleTrashItems([it]);
            setPreviewItem(null);
          }}
          onOpenDetails={() => setIsDetailsOpen(true)}
        />
      )}

      {/* 4. Bottom-Right Upload Progress Card */}
      <DriveUploadCard
        queue={uploadQueue}
        onPause={(id) => uploadManager.pause(id)}
        onResume={(id) => uploadManager.resume(id)}
        onCancel={(id) => uploadManager.cancel(id)}
        onClearDone={() => uploadManager.clearFinished()}
        onClose={() => uploadManager.clearFinished()}
      />

      {/* 5. Dialogs */}
      <RenameDialog
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        item={renameTarget}
        onRename={handleRenameConfirm}
      />

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {moveTargets && (
        <MoveDialog
          isOpen={!!moveTargets}
          onClose={() => setMoveTargets(null)}
          itemsToMove={moveTargets}
          allItems={items}
          onMoveConfirm={handleMoveConfirm}
          onCreateFolderInTarget={handleCreateFolder}
        />
      )}

      {confirmDeleteTargets && (
        <ConfirmDeleteDialog
          isOpen={!!confirmDeleteTargets}
          onClose={() => {
            if (!isDeleting) setConfirmDeleteTargets(null);
          }}
          count={confirmDeleteTargets.items.length}
          isEmptyTrash={confirmDeleteTargets.isEmptyTrash}
          onConfirm={() => handleDeleteForeverConfirm(confirmDeleteTargets.items)}
          isDeleting={isDeleting}
          deleteProgress={deleteProgress}
        />
      )}

      <ShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

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
          }}
        />
      )}

      {/* 6. Design System Showcase */}
      {isShowcaseOpen && <Showcase onClose={() => setIsShowcaseOpen(false)} />}

      {/* 7. Bottom-Left Floating Snackbar */}
      <Snackbar
        message={snackbar.message}
        isOpen={snackbar.isOpen}
        onClose={() => setSnackbar((prev) => ({ ...prev, isOpen: false }))}
        actionLabel={snackbar.actionLabel}
        onAction={snackbar.onAction}
      />

      {/* 8. Off-Screen File Inputs (Must NOT be display:none for iOS Safari & Mobile WebKit support) */}
      <input
        ref={fileInputRef}
        id="televault-file-input"
        type="file"
        multiple
        style={{ position: 'fixed', top: '-1000px', left: '-1000px', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) handleDropFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={mediaInputRef}
        id="televault-media-input"
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ position: 'fixed', top: '-1000px', left: '-1000px', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) handleDropFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        id="televault-folder-input"
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ position: 'fixed', top: '-1000px', left: '-1000px', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) handleDropFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 9. ZIP Export Progress Overlay */}
      {zipProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-divider/40 rounded-dialog p-6 max-w-sm w-full text-center space-y-3 shadow-dialog text-text-primary">
            <Icon name="refresh" size={32} className="animate-spin mx-auto text-accent" />
            <h3 className="text-base font-medium">Exporting ZIP Archive</h3>
            <p className="text-xs text-text-secondary font-mono">{zipProgress}</p>
          </div>
        </div>
      )}
    </div>
  );
};
