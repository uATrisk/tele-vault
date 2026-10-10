// API client for TeleVault backend

import { VaultHeader, ItemManifest } from '@televault/crypto';

export interface ApiItem {
  id: string;
  seq: number;
  rev: number;
  manifest: string; // hex
  sizeBytes: number;
  chunkCount: number;
  createdAt: number;
}

export interface ApiItemsResponse {
  ok: boolean;
  items: ApiItem[];
  tombstones: Array<{ seq: number; id: string }>;
  nextSeq: number;
}

export interface ApiDoctorResponse {
  ok: boolean;
  report: {
    ok: boolean;
    checks: Array<{ name: string; status: 'pass' | 'warn' | 'fail'; detail: string }>;
  };
}

export interface ApiStatsResponse {
  ok: boolean;
  stats: {
    itemCount: number;
    totalBytes: number;
    totalChunks: number;
    tombstonesCount: number;
  };
}

export const api = {
  async health(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      return !!data.ok;
    } catch {
      return false;
    }
  },

  async login(token: string): Promise<{ ok: boolean; status: number; error?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return { ...data, status: res.status };
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async getVault(): Promise<{ ok: boolean; status: number; header?: VaultHeader; rev?: number; error?: string }> {
    const res = await fetch('/api/vault');
    const data = await res.json().catch(() => ({ ok: false }));
    return { ...data, status: res.status };
  },

  async initVault(header: VaultHeader): Promise<{ ok: boolean; rev?: number; error?: string }> {
    const res = await fetch('/api/vault', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ header })
    });
    return res.json();
  },

  async rewrapVault(
    header: VaultHeader,
    expectedRev: number
  ): Promise<{ ok: boolean; rev?: number; error?: string }> {
    const res = await fetch('/api/vault/rewrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ header, expectedRev })
    });
    return res.json();
  },

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkBlob: Blob | Uint8Array,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ ok: boolean; messageId: number; fileId: string; size: number }> {
    if (typeof XMLHttpRequest !== 'undefined') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/chunks');
        xhr.setRequestHeader('X-Upload-Id', uploadId);
        xhr.setRequestHeader('X-Chunk-Index', chunkIndex.toString());
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');

        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(e.loaded, e.total);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ ok: true, messageId: 0, fileId: '', size: 0 });
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Chunk upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error uploading chunk'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        xhr.send(chunkBlob as any);
      });
    }

    const res = await fetch('/api/chunks', {
      method: 'POST',
      headers: {
        'X-Upload-Id': uploadId,
        'X-Chunk-Index': chunkIndex.toString(),
        'Content-Type': 'application/octet-stream'
      },
      body: chunkBlob as unknown as BodyInit
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Chunk upload failed (${res.status})`);
    }
    return res.json();
  },

  async downloadChunk(fileId: string): Promise<Uint8Array> {
    const res = await fetch(`/api/chunks/${encodeURIComponent(fileId)}`);
    if (!res.ok) {
      throw new Error(`Failed to download chunk: HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  },

  async getItems(since = 0, limit = 500): Promise<ApiItemsResponse> {
    const res = await fetch(`/api/items?since=${since}&limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch items: HTTP ${res.status}`);
    return res.json();
  },

  async commitItem(payload: {
    id: string;
    manifest: string;
    thumb?: string;
    chunks: Array<{ idx: number; messageId: number; fileId: string; size: number }>;
    sizeBytes: number;
    chunkCount: number;
    uploadId?: string;
  }): Promise<{ ok: boolean; seq: number }> {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to commit item: HTTP ${res.status}`);
    return res.json();
  },

  async updateItem(
    id: string,
    manifestHex: string,
    expectedRev: number
  ): Promise<{ ok: boolean; rev: number; seq: number }> {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: manifestHex, expectedRev })
    });
    if (res.status === 409) {
      throw new Error('Conflict (409): Item was modified elsewhere');
    }
    if (!res.ok) throw new Error(`Failed to update item: HTTP ${res.status}`);
    return res.json();
  },

  async deleteItem(id: string): Promise<{ ok: boolean }> {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete item: HTTP ${res.status}`);
    return res.json();
  },

  async getThumbs(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const res = await fetch(`/api/thumbs?ids=${ids.map(encodeURIComponent).join(',')}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.thumbs || {};
  },

  async getStats(): Promise<ApiStatsResponse> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`Failed to fetch stats: HTTP ${res.status}`);
    return res.json();
  },

  async getDoctor(): Promise<ApiDoctorResponse> {
    const res = await fetch('/api/doctor');
    if (!res.ok) throw new Error(`Doctor check failed: HTTP ${res.status}`);
    return res.json();
  },

  async createSnapshot(): Promise<{ ok: boolean; headMessageId: number; partFileId: string }> {
    const res = await fetch('/api/snapshot', { method: 'POST' });
    if (!res.ok) throw new Error(`Snapshot creation failed: HTTP ${res.status}`);
    return res.json();
  }
};
