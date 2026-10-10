import { describe, it, expect } from 'vitest';
import {
  getBreadcrumbs,
  getFolderContents,
  getDescendantIds,
  isInvalidMoveTarget,
  getUniqueName
} from './folderTree';
import { ItemManifest } from '@televault/crypto';

describe('folderTree utilities', () => {
  const mockItems: ItemManifest[] = [
    {
      v: 2,
      id: 'f_root1',
      kind: 'folder',
      parentId: null,
      name: 'Documents',
      mime: 'application/x-directory',
      size: 0,
      sha256: '',
      chunkSize: 0,
      chunks: [],
      takenAt: null,
      uploadedAt: '2026-10-10T00:00:00Z',
      width: null,
      height: null,
      durationMs: null,
      trashed: false,
      albumIds: []
    },
    {
      v: 2,
      id: 'f_sub1',
      kind: 'folder',
      parentId: 'f_root1',
      name: 'Work',
      mime: 'application/x-directory',
      size: 0,
      sha256: '',
      chunkSize: 0,
      chunks: [],
      takenAt: null,
      uploadedAt: '2026-10-10T00:00:00Z',
      width: null,
      height: null,
      durationMs: null,
      trashed: false,
      albumIds: []
    },
    {
      v: 2,
      id: 'file_01',
      kind: 'file',
      parentId: 'f_sub1',
      name: 'report.pdf',
      mime: 'application/pdf',
      size: 1024,
      sha256: 'hash1',
      chunkSize: 16777216,
      chunks: [],
      takenAt: null,
      uploadedAt: '2026-10-10T00:00:00Z',
      width: null,
      height: null,
      durationMs: null,
      trashed: false,
      albumIds: []
    }
  ];

  it('computes breadcrumbs correctly', () => {
    const crumbs = getBreadcrumbs(mockItems, 'f_sub1');
    expect(crumbs.map((c) => c.name)).toEqual(['Documents', 'Work']);
  });

  it('computes descendant IDs and detects circular moves', () => {
    const descendants = getDescendantIds(mockItems, 'f_root1');
    expect(descendants).toContain('f_sub1');
    expect(descendants).toContain('file_01');

    // Moving root into sub1 is invalid
    expect(isInvalidMoveTarget(mockItems, 'f_root1', 'f_sub1')).toBe(true);
    // Moving root into self is invalid
    expect(isInvalidMoveTarget(mockItems, 'f_root1', 'f_root1')).toBe(true);
    // Moving sub1 into root is valid
    expect(isInvalidMoveTarget(mockItems, 'f_sub1', null)).toBe(false);
  });

  it('generates unique duplicate name suffixes', () => {
    const existing = ['photo.jpg', 'photo (1).jpg', 'document.txt'];
    expect(getUniqueName(existing, 'photo.jpg')).toBe('photo (2).jpg');
    expect(getUniqueName(existing, 'other.jpg')).toBe('other.jpg');
    expect(getUniqueName(existing, 'document.txt')).toBe('document (1).txt');
  });

  it('retrieves folder contents partitioned into folders and files', () => {
    const contents = getFolderContents(mockItems, 'f_sub1');
    expect(contents.folders).toHaveLength(0);
    expect(contents.files).toHaveLength(1);
    expect(contents.files[0].name).toBe('report.pdf');

    const rootContents = getFolderContents(mockItems, null);
    expect(rootContents.folders).toHaveLength(1);
    expect(rootContents.folders[0].name).toBe('Documents');
  });
});
