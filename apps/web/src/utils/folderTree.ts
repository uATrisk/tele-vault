import { ItemManifest } from '@televault/crypto';

export interface FolderContents {
  folders: ItemManifest[];
  files: ItemManifest[];
}

/**
 * Returns the breadcrumb list of folder manifests from root to current folder.
 */
export function getBreadcrumbs(items: ItemManifest[], currentFolderId: string | null): ItemManifest[] {
  if (!currentFolderId) return [];

  const trail: ItemManifest[] = [];
  let currId: string | null = currentFolderId;
  const visited = new Set<string>();

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const folder = items.find((i) => i.id === currId && i.kind === 'folder' && !i.trashed);
    if (!folder) break;
    trail.unshift(folder);
    currId = folder.parentId ?? null;
  }

  return trail;
}

/**
 * Returns immediate folders and files inside a specific folder (or root when null).
 */
export function getFolderContents(
  items: ItemManifest[],
  currentFolderId: string | null,
  includeTrashed = false
): FolderContents {
  const folders: ItemManifest[] = [];
  const files: ItemManifest[] = [];

  for (const item of items) {
    if (!includeTrashed && item.trashed) continue;
    if (includeTrashed && !item.trashed) continue;

    const parent = item.parentId ?? null;
    if (parent === currentFolderId) {
      if (item.kind === 'folder') {
        folders.push(item);
      } else {
        files.push(item);
      }
    }
  }

  return { folders, files };
}

/**
 * Returns all recursive descendant IDs under a folder.
 */
export function getDescendantIds(items: ItemManifest[], folderId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [folderId];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const item of items) {
      if (item.parentId === parent && !descendants.has(item.id)) {
        descendants.add(item.id);
        if (item.kind === 'folder') {
          queue.push(item.id);
        }
      }
    }
  }

  return descendants;
}

/**
 * Checks if targetFolderId is equal to sourceFolderId or one of its descendants (to prevent cycles).
 */
export function isInvalidMoveTarget(items: ItemManifest[], sourceFolderId: string, targetFolderId: string | null): boolean {
  if (targetFolderId === null) return false; // moving to root is always valid
  if (sourceFolderId === targetFolderId) return true;
  const descendants = getDescendantIds(items, sourceFolderId);
  return descendants.has(targetFolderId);
}

/**
 * Generates duplicate name suffix: "photo.jpg" -> "photo (1).jpg", "photo (2).jpg"
 */
export function getUniqueName(existingNames: string[], desiredName: string): string {
  if (!existingNames.includes(desiredName)) return desiredName;

  // Split name and extension
  const lastDot = desiredName.lastIndexOf('.');
  let base = desiredName;
  let ext = '';
  if (lastDot > 0) {
    base = desiredName.slice(0, lastDot);
    ext = desiredName.slice(lastDot);
  }

  // Remove existing trailing " (N)" from base if present
  const match = base.match(/^(.*?)\s*\((\d+)\)$/);
  const cleanBase = match ? match[1] : base;

  let counter = 1;
  while (true) {
    const candidate = `${cleanBase} (${counter})${ext}`;
    if (!existingNames.includes(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Formats bytes to human-readable string (e.g. 1.2 MB, 450 KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats date to Google Drive style: "Oct 10, 2026" or "10:30 AM" if today.
 */
export function formatDriveDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
