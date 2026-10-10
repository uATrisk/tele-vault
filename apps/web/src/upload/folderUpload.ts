import { ItemManifest, encryptManifest, hexToBytes, bytesToHex } from '@televault/crypto';
import { api } from '../api';
import { uploadManager } from './uploader';
import { getFolderContents, getUniqueName } from '../utils/folderTree';

/**
 * Recursively scans DataTransferItemList for dropped files and folders.
 */
export async function scanDataTransferItems(
  items: DataTransferItemList
): Promise<Array<{ file: File; relativePath: string }>> {
  const result: Array<{ file: File; relativePath: string }> = [];

  async function traverseEntry(entry: any, currentPath: string): Promise<void> {
    if (!entry) return;
    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      result.push({
        file,
        relativePath: currentPath ? `${currentPath}/${file.name}` : file.name
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = async (): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };

      let entries = await readEntries();
      while (entries.length > 0) {
        for (const childEntry of entries) {
          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          await traverseEntry(childEntry, nextPath);
        }
        entries = await readEntries();
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        await traverseEntry(entry, '');
      }
    } else {
      const file = item.getAsFile();
      if (file) {
        result.push({ file, relativePath: file.name });
      }
    }
  }

  return result;
}

/**
 * Handles uploading files with directory paths (from webkitdirectory input or dropped folders).
 * Ensures folder hierarchies are created as zero-chunk folder items, then enqueues files.
 */
export async function uploadFilesWithStructure({
  filesWithPaths,
  rootParentId,
  allItems,
  manifestKey,
  onFolderCreated
}: {
  filesWithPaths: Array<{ file: File; relativePath: string }>;
  rootParentId: string | null;
  allItems: ItemManifest[];
  manifestKey: CryptoKey;
  onFolderCreated: (folder: ItemManifest) => void;
}): Promise<void> {
  const folderPathToId = new Map<string, string | null>();
  folderPathToId.set('', rootParentId);

  // Keep an in-memory mutable copy of items to resolve duplicates and existing folders
  const dynamicItems = [...allItems];

  for (const { file, relativePath } of filesWithPaths) {
    const segments = relativePath.split('/').filter(Boolean);
    // Filename is the last segment
    const fileName = segments.pop() || file.name;

    // Traverse and ensure directory segments exist
    let currentParentId = rootParentId;
    let accumulatedPath = '';

    for (const segment of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;

      if (folderPathToId.has(accumulatedPath)) {
        currentParentId = folderPathToId.get(accumulatedPath)!;
      } else {
        // Check if folder already exists in target parent
        const existingFolder = dynamicItems.find(
          (i) => i.kind === 'folder' && !i.trashed && i.parentId === currentParentId && i.name === segment
        );

        if (existingFolder) {
          currentParentId = existingFolder.id;
          folderPathToId.set(accumulatedPath, existingFolder.id);
        } else {
          // Create new folder item
          const newFolderId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          const folderManifest: ItemManifest = {
            v: 2,
            id: newFolderId,
            kind: 'folder',
            parentId: currentParentId,
            name: segment,
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

          const cipherBytes = await encryptManifest(
            manifestKey,
            hexToBytes(newFolderId),
            1,
            folderManifest
          );

          await api.commitItem({
            id: newFolderId,
            manifest: bytesToHex(cipherBytes),
            chunks: [],
            sizeBytes: 0,
            chunkCount: 0
          });

          dynamicItems.push(folderManifest);
          onFolderCreated(folderManifest);
          currentParentId = newFolderId;
          folderPathToId.set(accumulatedPath, newFolderId);
        }
      }
    }

    // Now enqueue file under currentParentId
    const targetContents = getFolderContents(dynamicItems, currentParentId);
    const existingFileNames = targetContents.files.map((f) => f.name);
    uploadManager.enqueueFiles([file], currentParentId, existingFileNames);
  }
}
