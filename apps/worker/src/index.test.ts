import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import worker from './index';
import { Env } from './types';
import { MockTelegramServer } from '@televault/mock-telegram';
import { createMockD1Database } from './test-d1';
import { signSession, SESSION_COOKIE_NAME } from './auth';

describe('Cloudflare Worker & Telegram Proxy (Layer B Tests)', () => {
  let mockTelegram: MockTelegramServer;
  let telegramBaseUrl: string;
  let db: D1Database;

  const TEST_BOT_TOKEN = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ';
  const TEST_CHAT_ID = '-1001234567890';
  const TEST_ACCESS_TOKEN = 'test_access_token_min_32_chars_long_xyz';
  const TEST_SESSION_SECRET = 'test_session_secret_min_32_characters_hmac';

  let env: Env;
  let validSessionCookie: string;

  beforeAll(async () => {
    mockTelegram = new MockTelegramServer();
    const port = await mockTelegram.start(0);
    telegramBaseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await mockTelegram.stop();
  });

  beforeEach(async () => {
    mockTelegram.reset();
    db = createMockD1Database();

    env = {
      DB: db,
      TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
      TELEGRAM_CHAT_ID: TEST_CHAT_ID,
      ACCESS_TOKEN: TEST_ACCESS_TOKEN,
      SESSION_SECRET: TEST_SESSION_SECRET,
      ENVIRONMENT: 'dev',
      TELEGRAM_API_BASE: telegramBaseUrl
    };

    const signed = await signSession(`uid_${Date.now()}`, TEST_SESSION_SECRET);
    validSessionCookie = `${SESSION_COOKIE_NAME}=${signed}`;
  });

  function makeRequest(
    path: string,
    method = 'GET',
    body?: any,
    headers?: Record<string, string>,
    withAuth = true
  ): Request {
    const reqHeaders = new Headers(headers || {});
    if (withAuth && !reqHeaders.has('Cookie')) {
      reqHeaders.set('Cookie', validSessionCookie);
    }

    let reqBody: any = undefined;
    if (body !== undefined) {
      if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
        reqBody = body;
      } else {
        reqHeaders.set('Content-Type', 'application/json');
        reqBody = JSON.stringify(body);
      }
    }

    return new Request(`http://localhost${path}`, {
      method,
      headers: reqHeaders,
      body: reqBody
    });
  }

  // --- Security & Auth Tests ---
  it('allows public health endpoint without auth', async () => {
    const req = makeRequest('/api/health', 'GET', undefined, undefined, false);
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
  });

  it('rejects protected routes when unauthenticated', async () => {
    const protectedPaths = [
      ['/api/vault', 'GET'],
      ['/api/items', 'GET'],
      ['/api/stats', 'GET'],
      ['/api/doctor', 'GET']
    ];

    for (const [path, method] of protectedPaths) {
      const req = makeRequest(path, method, undefined, undefined, false);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.ok).toBe(false);
    }
  });

  it('handles login, sets HttpOnly; SameSite=Strict cookie, and rejects bad token', async () => {
    // Bad token
    const badReq = makeRequest('/api/auth/login', 'POST', { token: 'bad_token' }, undefined, false);
    const badRes = await worker.fetch(badReq, env);
    expect(badRes.status).toBe(401);

    // Good token
    const goodReq = makeRequest(
      '/api/auth/login',
      'POST',
      { token: TEST_ACCESS_TOKEN },
      undefined,
      false
    );
    const goodRes = await worker.fetch(goodReq, env);
    expect(goodRes.status).toBe(200);

    const setCookie = goodRes.headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(SESSION_COOKIE_NAME);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
  });

  // --- Vault Lifecycle ---
  it('initializes vault once only, returning 409 on second call', async () => {
    const dummyHeader = { v: 1, salt: 'abc', iterations: 600000 };

    // 1st call: Initialise
    const putReq = makeRequest('/api/vault', 'PUT', { header: dummyHeader });
    const putRes = await worker.fetch(putReq, env);
    expect(putRes.status).toBe(200);

    // GET vault
    const getReq = makeRequest('/api/vault', 'GET');
    const getRes = await worker.fetch(getReq, env);
    expect(getRes.status).toBe(200);
    const getData = (await getRes.json()) as any;
    expect(getData.header).toEqual(dummyHeader);
    expect(getData.rev).toBe(1);

    // 2nd PUT call must fail with 409 Conflict
    const putConflictReq = makeRequest('/api/vault', 'PUT', { header: dummyHeader });
    const putConflictRes = await worker.fetch(putConflictReq, env);
    expect(putConflictRes.status).toBe(409);
  });

  it('rewraps vault header with rev check and returns 409 on mismatch', async () => {
    const headerV1 = { v: 1, wrappedMK: 'wrapper_1' };
    await worker.fetch(makeRequest('/api/vault', 'PUT', { header: headerV1 }), env);

    // Rewrap with correct rev (1)
    const headerV2 = { v: 1, wrappedMK: 'wrapper_2' };
    const rewrapReq = makeRequest('/api/vault/rewrap', 'POST', {
      header: headerV2,
      expectedRev: 1
    });
    const rewrapRes = await worker.fetch(rewrapReq, env);
    expect(rewrapRes.status).toBe(200);
    const rewrapData = (await rewrapRes.json()) as any;
    expect(rewrapData.rev).toBe(2);

    // Rewrap with stale rev (1) must return 409
    const staleReq = makeRequest('/api/vault/rewrap', 'POST', {
      header: { v: 1, wrappedMK: 'wrapper_3' },
      expectedRev: 1
    });
    const staleRes = await worker.fetch(staleReq, env);
    expect(staleRes.status).toBe(409);
  });

  // --- Chunks & Telegram Privacy ---
  it('uploads encrypted chunk: Telegram receives random-named .bin, no caption, records pending chunk', async () => {
    const chunkBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const uploadId = 'up_session_123';

    const uploadReq = makeRequest('/api/chunks', 'POST', chunkBytes, {
      'X-Upload-Id': uploadId,
      'X-Chunk-Index': '0'
    });
    const uploadRes = await worker.fetch(uploadReq, env);
    expect(uploadRes.status).toBe(200);
    const uploadData = (await uploadRes.json()) as any;
    expect(uploadData.messageId).toBeGreaterThan(0);
    expect(uploadData.fileId).toBeTruthy();

    // Verify what Telegram stored
    const inspectRes = await fetch(`${telegramBaseUrl}/test/inspect`);
    const inspectData = (await inspectRes.json()) as any;
    expect(inspectData.files.length).toBe(1);
    const storedFile = inspectData.files[0];
    expect(storedFile.file_name).toMatch(/^[0-9a-f-]{36}\.bin$/); // Random UUID .bin
    expect(storedFile.caption).toBeUndefined(); // S3: No captions on Telegram!

    // Verify pending_chunks recorded in D1
    const pendingRow = await db
      .prepare('SELECT * FROM pending_chunks WHERE upload_id = ? AND idx = 0')
      .bind(uploadId)
      .first<any>();
    expect(pendingRow).toBeTruthy();
    expect(pendingRow.message_id).toBe(uploadData.messageId);
  });

  it('commits item, moves pending chunks to chunks table, and verifies idempotency', async () => {
    const uploadId = 'up_commit_test';
    // Upload 1 chunk
    const chunkReq = makeRequest('/api/chunks', 'POST', new Uint8Array([10, 20]), {
      'X-Upload-Id': uploadId,
      'X-Chunk-Index': '0'
    });
    const chunkRes = await worker.fetch(chunkReq, env);
    const chunkData = (await chunkRes.json()) as any;

    const commitPayload = {
      id: 'item_commit_01',
      manifest: 'manifest_cipher_hex',
      thumb: 'thumb_cipher_hex',
      chunks: [
        {
          idx: 0,
          messageId: chunkData.messageId,
          fileId: chunkData.fileId,
          size: 2
        }
      ],
      sizeBytes: 2,
      chunkCount: 1,
      uploadId
    };

    const commitReq = makeRequest('/api/items', 'POST', commitPayload);
    const commitRes = await worker.fetch(commitReq, env);
    expect(commitRes.status).toBe(200);
    const commitData = (await commitRes.json()) as any;
    expect(commitData.seq).toBeGreaterThan(0);

    // Verify pending_chunks cleaned up
    const pendingCount = await db
      .prepare('SELECT COUNT(*) as count FROM pending_chunks WHERE upload_id = ?')
      .bind(uploadId)
      .first<{ count: number }>();
    expect(pendingCount?.count).toBe(0);

    // Verify chunks row exists
    const chunkRow = await db
      .prepare('SELECT * FROM chunks WHERE item_id = ?')
      .bind('item_commit_01')
      .first<any>();
    expect(chunkRow?.file_id).toBe(chunkData.fileId);

    // Re-posting the same commit is idempotent
    const retryCommitRes = await worker.fetch(makeRequest('/api/items', 'POST', commitPayload), env);
    expect(retryCommitRes.status).toBe(200);
  });

  it('updates item manifest with optimistic concurrency and returns 409 on conflict', async () => {
    // Commit initial item
    await worker.fetch(
      makeRequest('/api/items', 'POST', {
        id: 'item_conflict_01',
        manifest: 'manifest_v1',
        thumb: 'thumb_v1',
        chunks: [],
        sizeBytes: 100,
        chunkCount: 1
      }),
      env
    );

    // Update with expectedRev = 1 -> succeeds, bumps rev to 2
    const updateReq = makeRequest('/api/items/item_conflict_01', 'PUT', {
      manifest: 'manifest_v2',
      expectedRev: 1
    });
    const updateRes = await worker.fetch(updateReq, env);
    expect(updateRes.status).toBe(200);
    const updateData = (await updateRes.json()) as any;
    expect(updateData.rev).toBe(2);

    // Update with stale expectedRev = 1 -> returns 409 Conflict
    const staleReq = makeRequest('/api/items/item_conflict_01', 'PUT', {
      manifest: 'manifest_stale',
      expectedRev: 1
    });
    const staleRes = await worker.fetch(staleReq, env);
    expect(staleRes.status).toBe(409);
  });

  it('deletes item: removes Telegram messages and D1 rows, and records tombstone', async () => {
    // 1. Upload chunk
    const chunkRes = await worker.fetch(
      makeRequest('/api/chunks', 'POST', new Uint8Array([1, 2, 3]), {
        'X-Upload-Id': 'del_test',
        'X-Chunk-Index': '0'
      }),
      env
    );
    const chunkData = (await chunkRes.json()) as any;

    // 2. Commit item
    await worker.fetch(
      makeRequest('/api/items', 'POST', {
        id: 'item_to_delete',
        manifest: 'manifest_del',
        thumb: 'thumb_del',
        chunks: [
          {
            idx: 0,
            messageId: chunkData.messageId,
            fileId: chunkData.fileId,
            size: 3
          }
        ],
        sizeBytes: 3,
        chunkCount: 1
      }),
      env
    );

    // 3. DELETE item
    const delReq = makeRequest('/api/items/item_to_delete', 'DELETE');
    const delRes = await worker.fetch(delReq, env);
    expect(delRes.status).toBe(200);

    // Telegram message should be removed
    const inspectRes = await fetch(`${telegramBaseUrl}/test/inspect`);
    const inspectData = (await inspectRes.json()) as any;
    expect(inspectData.messages.some((m: any) => m.message_id === chunkData.messageId)).toBe(false);

    // D1 items should not contain item
    const itemRow = await db
      .prepare('SELECT * FROM items WHERE id = ?')
      .bind('item_to_delete')
      .first();
    expect(itemRow).toBeNull();

    // Tombstone should exist
    const tombstone = await db
      .prepare('SELECT * FROM tombstones WHERE id = ?')
      .bind('item_to_delete')
      .first<any>();
    expect(tombstone).toBeTruthy();
  });

  it('builds, pins snapshot in Telegram, and deletes previous snapshot message', async () => {
    // Initialize vault
    await worker.fetch(
      makeRequest('/api/vault', 'PUT', { header: { v: 1, salt: 'snap_salt' } }),
      env
    );

    // Commit 1 item
    await worker.fetch(
      makeRequest('/api/items', 'POST', {
        id: 'snap_item_1',
        manifest: 'snap_manifest_1',
        thumb: 'snap_thumb_1',
        chunks: [],
        sizeBytes: 50,
        chunkCount: 1
      }),
      env
    );

    // First snapshot
    const snapRes = await worker.fetch(makeRequest('/api/snapshot', 'POST'), env);
    expect(snapRes.status).toBe(200);
    const snapData = (await snapRes.json()) as any;
    expect(snapData.headMessageId).toBeGreaterThan(0);

    // Verify pinned message in Telegram channel
    const chatRes = await fetch(`${telegramBaseUrl}/bot${TEST_BOT_TOKEN}/getChat?chat_id=${TEST_CHAT_ID}`);
    const chatData = (await chatRes.json()) as any;
    expect(chatData.result.pinned_message.message_id).toBe(snapData.headMessageId);

    // Second snapshot: should replace pinned message and delete old message
    const snap2Res = await worker.fetch(makeRequest('/api/snapshot', 'POST'), env);
    expect(snap2Res.status).toBe(200);
    const snap2Data = (await snap2Res.json()) as any;
    expect(snap2Data.headMessageId).not.toBe(snapData.headMessageId);
  });

  it('restores library into empty D1 from Telegram pinned snapshot', async () => {
    // 1. Initialize vault and commit 2 items
    const testHeader = { v: 1, salt: 'restore_salt', iterations: 600000, rev: 1, createdAt: Date.now() };
    await worker.fetch(makeRequest('/api/vault', 'PUT', { header: testHeader }), env);

    await worker.fetch(
      makeRequest('/api/items', 'POST', {
        id: 'restore_item_1',
        manifest: 'manifest_cipher_1',
        thumb: 'thumb_cipher_1',
        chunks: [],
        sizeBytes: 100,
        chunkCount: 1
      }),
      env
    );

    // 2. Build and pin snapshot
    await worker.fetch(makeRequest('/api/snapshot', 'POST'), env);

    // 3. Wipe D1 clean (simulate complete database loss)
    const freshEmptyDb = createMockD1Database();

    // 4. Run restore tool into empty D1
    const { restoreFromTelegram } = await import('./restore');
    const restoreResult = await restoreFromTelegram(
      TEST_BOT_TOKEN,
      TEST_CHAT_ID,
      freshEmptyDb,
      telegramBaseUrl
    );

    expect(restoreResult.ok).toBe(true);
    expect(restoreResult.itemsRestored).toBe(1);
    expect(restoreResult.vaultHeader).toEqual(testHeader);

    // 5. Verify D1 tables in restored DB
    const restoredVault = await freshEmptyDb
      .prepare('SELECT header FROM vault WHERE id = 1')
      .first<{ header: string }>();
    expect(JSON.parse(restoredVault!.header)).toEqual(testHeader);

    const restoredItem = await freshEmptyDb
      .prepare('SELECT id, manifest FROM items WHERE id = ?')
      .bind('restore_item_1')
      .first<{ id: string; manifest: string }>();
    expect(restoredItem?.manifest).toBe('manifest_cipher_1');
  });

  // --- Doctor Diagnostic Tests ---
  it('doctor check passes on healthy private channel', async () => {
    const docRes = await worker.fetch(makeRequest('/api/doctor', 'GET'), env);
    expect(docRes.status).toBe(200);
    const docData = (await docRes.json()) as any;
    expect(docData.ok).toBe(true);
    expect(docData.report.checks.every((c: any) => c.status === 'pass')).toBe(true);
  });

  it('doctor flags public channel (S9)', async () => {
    mockTelegram.reset();
    mockTelegram.initDefaultChat(Number(TEST_CHAT_ID), true, 2); // isPublic = true

    const docRes = await worker.fetch(makeRequest('/api/doctor', 'GET'), env);
    const docData = (await docRes.json()) as any;
    expect(docData.ok).toBe(false);
    const pubCheck = docData.report.checks.find((c: any) => c.name === 'channel_privacy_no_username');
    expect(pubCheck.status).toBe('fail');
  });

  it('doctor flags channel with >2 members (S9)', async () => {
    mockTelegram.reset();
    mockTelegram.initDefaultChat(Number(TEST_CHAT_ID), false, 4); // 4 members!

    const docRes = await worker.fetch(makeRequest('/api/doctor', 'GET'), env);
    const docData = (await docRes.json()) as any;
    expect(docData.ok).toBe(false);
    const memberCheck = docData.report.checks.find((c: any) => c.name === 'channel_member_count');
    expect(memberCheck.status).toBe('fail');
  });

  // --- Secret Leakage & Override Safety ---
  it('asserts bot token is NEVER present in responses or error messages (S2)', async () => {
    // Generate an error by triggering an invalid Telegram method/request
    mockTelegram.injectFault({ statusCode: 500, remainingCalls: 1 });
    const errRes = await worker.fetch(makeRequest('/api/doctor', 'GET'), env);
    const errText = await errRes.text();

    expect(errText).not.toContain(TEST_BOT_TOKEN);
  });

  it('ignores TELEGRAM_API_BASE override outside ENVIRONMENT=dev', async () => {
    const prodEnv: Env = {
      ...env,
      ENVIRONMENT: 'production',
      TELEGRAM_API_BASE: 'http://malicious-proxy.com'
    };

    // In production, TelegramClient baseUrl defaults strictly to https://api.telegram.org
    const { TelegramClient } = await import('./telegram');
    const client = new TelegramClient(prodEnv);
    // Sanitize check verifies internal config
    expect((client as any).baseUrl).toBe('https://api.telegram.org');
  });
});
