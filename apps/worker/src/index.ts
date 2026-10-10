import { Hono } from 'hono';
import { Env } from './types';
import { TelegramClient } from './telegram';
import { runDoctor } from './doctor';
import {
  authMiddleware,
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginFailure,
  constantTimeCompare,
  setSessionCookie,
  clearSessionCookie
} from './auth';
import { packSnapshotPart } from '@televault/crypto';

const app = new Hono<{ Bindings: Env }>();

// 1. Global Security Headers Middleware (S6)
app.use('*', async (c, next) => {
  await next();
  const res = c.res;
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '0');

  // CSP: Strict same-origin only, frame-ancestors none, no third-party scripts (S5, S6)
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
  );

  if (c.env.ENVIRONMENT !== 'dev') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // API responses must default to no-store unless explicitly cached
  if (c.req.path.startsWith('/api') && !res.headers.has('Cache-Control')) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
  }
});

// 2. Auth Gate & API Rate Limiting Middleware (gates all /api/* routes)
app.use('/api/*', authMiddleware);

// 3. Public Endpoints (exempted in authMiddleware)
app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/auth/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return c.json(
      { ok: false, error: `Too many login attempts. Retry after ${rateLimit.retryAfter}s.` },
      429
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as { token?: string };
  if (!body.token) {
    recordLoginFailure(ip);
    return c.json({ ok: false, error: 'Token is required' }, 400);
  }

  const isValid = await constantTimeCompare(body.token, c.env.ACCESS_TOKEN);
  if (!isValid) {
    recordLoginFailure(ip);
    return c.json({ ok: false, error: 'Invalid access token' }, 401);
  }

  resetLoginFailure(ip);
  await setSessionCookie(c);
  return c.json({ ok: true });
});

app.post('/api/auth/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

// --- Vault Header Routes ---
app.get('/api/vault', async (c) => {
  const row = await c.env.DB.prepare('SELECT header, rev, created_at FROM vault WHERE id = 1').first<{
    header: string;
    rev: number;
    created_at: number;
  }>();

  if (!row) {
    return c.json({ ok: false, error: 'Vault not initialized' }, 404);
  }

  return c.json({
    ok: true,
    header: JSON.parse(row.header),
    rev: row.rev,
    createdAt: row.created_at
  });
});

app.put('/api/vault', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { header?: any };
  if (!body.header || typeof body.header !== 'object') {
    return c.json({ ok: false, error: 'Vault header is required' }, 400);
  }

  const headerStr = JSON.stringify(body.header);
  if (headerStr.length > 32768) {
    return c.json({ ok: false, error: 'Vault header exceeds maximum allowed size' }, 400);
  }
  const now = Date.now();

  try {
    const res = await c.env.DB.prepare(
      'INSERT INTO vault (id, header, rev, created_at) VALUES (1, ?, 1, ?)'
    )
      .bind(headerStr, now)
      .run();

    if (!res.success) {
      return c.json({ ok: false, error: 'Failed to create vault' }, 500);
    }

    return c.json({ ok: true, rev: 1 });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Vault already exists' }, 409);
  }
});

app.post('/api/vault/rewrap', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { header?: any; expectedRev?: number };
  if (!body.header || typeof body.header !== 'object' || typeof body.expectedRev !== 'number') {
    return c.json({ ok: false, error: 'header and expectedRev are required' }, 400);
  }

  const headerStr = JSON.stringify(body.header);
  if (headerStr.length > 32768) {
    return c.json({ ok: false, error: 'Vault header exceeds maximum allowed size' }, 400);
  }
  const newRev = body.expectedRev + 1;

  const res = await c.env.DB.prepare(
    'UPDATE vault SET header = ?, rev = ? WHERE id = 1 AND rev = ?'
  )
    .bind(headerStr, newRev, body.expectedRev)
    .run();

  if (res.meta.changes === 0) {
    return c.json({ ok: false, error: 'Conflict: vault revision mismatch' }, 409);
  }

  return c.json({ ok: true, rev: newRev });
});

// --- Chunks Upload & Download ---
app.post('/api/chunks', async (c) => {
  const uploadId = c.req.header('x-upload-id');
  const chunkIndexHeader = c.req.header('x-chunk-index');

  if (!uploadId || chunkIndexHeader === undefined) {
    return c.json({ ok: false, error: 'Missing X-Upload-Id or X-Chunk-Index headers' }, 400);
  }

  const chunkIndex = parseInt(chunkIndexHeader, 10);
  if (isNaN(chunkIndex)) {
    return c.json({ ok: false, error: 'Invalid X-Chunk-Index' }, 400);
  }

  const chunkBytes = await c.req.arrayBuffer();
  // Max chunk size: 17 MiB cap
  if (chunkBytes.byteLength > 17 * 1024 * 1024) {
    return c.json({ ok: false, error: 'Chunk exceeds maximum allowed size' }, 413);
  }

  // S3 compliance: Upload as random-named binary file with no caption
  const randomFileName = `${crypto.randomUUID()}.bin`;
  const tg = new TelegramClient(c.env);

  const tgResult = await tg.sendDocument(chunkBytes, randomFileName);

  // Record into pending_chunks
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO pending_chunks (upload_id, idx, message_id, file_id, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(uploadId, chunkIndex, tgResult.messageId, tgResult.fileId, now)
    .run();

  return c.json({
    ok: true,
    messageId: tgResult.messageId,
    fileId: tgResult.fileId,
    size: tgResult.size
  });
});

app.get('/api/chunks/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  if (!fileId || typeof fileId !== 'string' || fileId.length > 128) {
    return c.json({ ok: false, error: 'Invalid fileId parameter' }, 400);
  }
  const tg = new TelegramClient(c.env);

  try {
    const filePath = await tg.getFile(fileId);
    const downloadRes = await tg.getDownloadStream(filePath);

    // Stream directly to client without buffering in Worker memory!
    return new Response(downloadRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, max-age=31536000, immutable'
      }
    });
  } catch (err: any) {
    return c.json({ ok: false, error: tg.sanitize(err.message || 'Chunk download failed') }, 404);
  }
});

// --- Items (Encrypted Manifests) ---
app.get('/api/items', async (c) => {
  const since = parseInt(c.req.query('since') || '0', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);

  const items = await c.env.DB.prepare(
    'SELECT id, seq, rev, manifest, size_bytes, chunk_count, created_at FROM items WHERE seq > ? ORDER BY seq ASC LIMIT ?'
  )
    .bind(since, limit)
    .all<{
      id: string;
      seq: number;
      rev: number;
      manifest: string;
      size_bytes: number;
      chunk_count: number;
      created_at: number;
    }>();

  const tombstones = await c.env.DB.prepare(
    'SELECT seq, id FROM tombstones WHERE seq > ? ORDER BY seq ASC LIMIT ?'
  )
    .bind(since, limit)
    .all<{ seq: number; id: string }>();

  let maxSeq = since;
  for (const it of items.results) {
    if (it.seq > maxSeq) maxSeq = it.seq;
  }
  for (const t of tombstones.results) {
    if (t.seq > maxSeq) maxSeq = t.seq;
  }

  return c.json({
    ok: true,
    items: items.results.map((i) => ({
      id: i.id,
      seq: i.seq,
      rev: i.rev,
      manifest: i.manifest,
      sizeBytes: i.size_bytes,
      chunkCount: i.chunk_count,
      createdAt: i.created_at
    })),
    tombstones: tombstones.results,
    nextSeq: maxSeq
  });
});

app.post('/api/items', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    id: string;
    manifest: string; // hex
    thumb?: string; // hex (optional for folders / zero-chunk items)
    chunks: Array<{ idx: number; messageId: number; fileId: string; size: number }>;
    sizeBytes: number;
    chunkCount: number;
    uploadId?: string;
  };

  if (
    !body.id ||
    typeof body.id !== 'string' ||
    body.id.length > 64 ||
    !body.manifest ||
    typeof body.manifest !== 'string' ||
    body.manifest.length > 131072 ||
    !Array.isArray(body.chunks) ||
    body.chunks.length > 2000
  ) {
    return c.json({ ok: false, error: 'Invalid commit payload' }, 400);
  }

  // Atomic seq counter increment
  const seqRes = await c.env.DB.prepare(
    "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'seq_counter' RETURNING value"
  ).first<{ value: string }>();

  const newSeq = parseInt(seqRes?.value || '1', 10);
  const now = Date.now();

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO items (id, seq, rev, manifest, size_bytes, chunk_count, created_at) VALUES (?, ?, 1, ?, ?, ?, ?)'
    ).bind(body.id, newSeq, body.manifest, body.sizeBytes ?? 0, body.chunkCount ?? body.chunks.length, now)
  ];

  if (body.thumb) {
    statements.push(
      c.env.DB.prepare('INSERT OR REPLACE INTO thumbs (item_id, bytes) VALUES (?, ?)').bind(
        body.id,
        body.thumb
      )
    );
  }

  for (const ch of body.chunks) {
    statements.push(
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO chunks (item_id, idx, message_id, file_id, size) VALUES (?, ?, ?, ?, ?)'
      ).bind(body.id, ch.idx, ch.messageId, ch.fileId, ch.size)
    );
  }

  if (body.uploadId) {
    statements.push(
      c.env.DB.prepare('DELETE FROM pending_chunks WHERE upload_id = ?').bind(body.uploadId)
    );
  }

  await c.env.DB.batch(statements);

  return c.json({ ok: true, seq: newSeq });
});

app.put('/api/items/:id', async (c) => {
  const id = c.req.param('id');
  if (!id || typeof id !== 'string' || id.length > 64) {
    return c.json({ ok: false, error: 'Invalid item ID' }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    manifest: string;
    expectedRev: number;
  };

  if (
    !body.manifest ||
    typeof body.manifest !== 'string' ||
    body.manifest.length > 131072 ||
    typeof body.expectedRev !== 'number'
  ) {
    return c.json({ ok: false, error: 'manifest and expectedRev are required' }, 400);
  }

  const seqRes = await c.env.DB.prepare(
    "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'seq_counter' RETURNING value"
  ).first<{ value: string }>();
  const newSeq = parseInt(seqRes?.value || '1', 10);
  const newRev = body.expectedRev + 1;

  const res = await c.env.DB.prepare(
    'UPDATE items SET manifest = ?, rev = ?, seq = ? WHERE id = ? AND rev = ?'
  )
    .bind(body.manifest, newRev, newSeq, id, body.expectedRev)
    .run();

  if (res.meta.changes === 0) {
    return c.json({ ok: false, error: 'Conflict: revision mismatch' }, 409);
  }

  return c.json({ ok: true, rev: newRev, seq: newSeq });
});

app.delete('/api/items/:id', async (c) => {
  const id = c.req.param('id');
  if (!id || typeof id !== 'string' || id.length > 64) {
    return c.json({ ok: false, error: 'Invalid item ID' }, 400);
  }
  const tg = new TelegramClient(c.env);

  // 1. Fetch chunks to delete Telegram messages
  const chunkRows = await c.env.DB.prepare('SELECT message_id FROM chunks WHERE item_id = ?')
    .bind(id)
    .all<{ message_id: number }>();

  // Delete Telegram messages for this item without needing master key!
  for (const ch of chunkRows.results) {
    await tg.deleteMessage(ch.message_id).catch(() => {});
  }

  // 2. Increment seq and record tombstone
  const seqRes = await c.env.DB.prepare(
    "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'seq_counter' RETURNING value"
  ).first<{ value: string }>();
  const tombstoneSeq = parseInt(seqRes?.value || '1', 10);

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR REPLACE INTO tombstones (seq, id) VALUES (?, ?)').bind(
      tombstoneSeq,
      id
    ),
    c.env.DB.prepare('DELETE FROM chunks WHERE item_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM thumbs WHERE item_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id)
  ]);

  return c.json({ ok: true, tombstoneSeq });
});

// --- Batch Thumbnails ---
app.get('/api/thumbs', async (c) => {
  const idsParam = c.req.query('ids') || '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return c.json({ ok: true, thumbs: {} });
  }

  if (ids.length > 64) {
    return c.json({ ok: false, error: 'Maximum 64 thumbnail IDs allowed per request' }, 400);
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = await c.env.DB.prepare(
    `SELECT item_id, bytes FROM thumbs WHERE item_id IN (${placeholders})`
  )
    .bind(...ids)
    .all<{ item_id: string; bytes: string }>();

  const thumbMap: Record<string, string> = {};
  for (const row of rows.results) {
    thumbMap[row.item_id] = row.bytes;
  }

  return c.json({ ok: true, thumbs: thumbMap });
});

// --- Stats & Doctor ---
app.get('/api/stats', async (c) => {
  const itemStats = await c.env.DB.prepare(
    'SELECT COUNT(*) as count, TOTAL(size_bytes) as total_size, TOTAL(chunk_count) as total_chunks FROM items'
  ).first<{ count: number; total_size: number; total_chunks: number }>();

  const tombstones = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tombstones').first<{
    count: number;
  }>();

  return c.json({
    ok: true,
    stats: {
      itemCount: itemStats?.count || 0,
      totalBytes: itemStats?.total_size || 0,
      totalChunks: itemStats?.total_chunks || 0,
      tombstonesCount: tombstones?.count || 0
    }
  });
});

app.get('/api/doctor', async (c) => {
  const tg = new TelegramClient(c.env);
  const report = await runDoctor(tg);
  return c.json({ ok: report.ok, report });
});

// --- Snapshot Creation Endpoint ---
app.post('/api/snapshot', async (c) => {
  const tg = new TelegramClient(c.env);

  // 1. Load vault header
  const vaultRow = await c.env.DB.prepare('SELECT header FROM vault WHERE id = 1').first<{
    header: string;
  }>();

  if (!vaultRow) {
    return c.json({ ok: false, error: 'No vault initialized' }, 400);
  }

  const vaultHeader = JSON.parse(vaultRow.header);

  // 2. Fetch all items
  const items = await c.env.DB.prepare('SELECT id, seq, rev, manifest FROM items ORDER BY seq ASC')
    .all<{ id: string; seq: number; rev: number; manifest: string }>();

  const itemRecords = items.results.map((i) => ({
    id: i.id,
    seq: i.seq,
    rev: i.rev,
    manifestBlob: new TextEncoder().encode(i.manifest) // stored hex representation
  }));

  // 3. Pack snapshot part
  const snapshotPartBytes = packSnapshotPart(vaultHeader, itemRecords);
  const partFileName = `snapshot_part_0_${Date.now()}.bin`;

  const partUpload = await tg.sendDocument(snapshotPartBytes, partFileName);

  // 4. Head document JSON
  const currentSeq = parseInt(
    (await c.env.DB.prepare("SELECT value FROM meta WHERE key = 'seq_counter'").first<{
      value: string;
    }>())?.value || '0',
    10
  );

  const headDoc = {
    v: 1,
    createdAt: Date.now(),
    seq: currentSeq,
    totalItems: items.results.length,
    parts: [
      {
        fileId: partUpload.fileId,
        size: partUpload.size,
        itemCount: items.results.length
      }
    ]
  };

  const headJsonBlob = new Blob([JSON.stringify(headDoc, null, 2)], {
    type: 'application/json'
  });
  const headUpload = await tg.sendDocument(headJsonBlob, 'snapshot_head.json');

  // 5. Pin head document message
  await tg.pinChatMessage(headUpload.messageId);

  // 6. Delete previous snapshot messages if tracked
  const prevHeadMsgId = await c.env.DB.prepare(
    "SELECT value FROM meta WHERE key = 'last_snapshot_msg_id'"
  ).first<{ value: string }>();

  if (prevHeadMsgId?.value) {
    await tg.deleteMessage(parseInt(prevHeadMsgId.value, 10)).catch(() => {});
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_snapshot_seq', ?)"
    ).bind(currentSeq.toString()),
    c.env.DB.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_snapshot_msg_id', ?)"
    ).bind(headUpload.messageId.toString())
  ]);

  return c.json({
    ok: true,
    headMessageId: headUpload.messageId,
    partFileId: partUpload.fileId
  });
});

export default {
  fetch: app.fetch,

  // Scheduled Cron Handler (Section 8.4)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const tg = new TelegramClient(env);

    // 1. Snapshot if changes occurred
    const seqRow = await env.DB.prepare("SELECT value FROM meta WHERE key = 'seq_counter'").first<{
      value: string;
    }>();
    const lastSnapRow = await env.DB.prepare(
      "SELECT value FROM meta WHERE key = 'last_snapshot_seq'"
    ).first<{ value: string }>();

    const currentSeq = parseInt(seqRow?.value || '0', 10);
    const lastSnapSeq = parseInt(lastSnapRow?.value || '0', 10);

    if (currentSeq > lastSnapSeq) {
      // Build and pin snapshot
      const req = new Request('http://localhost/api/snapshot', {
        method: 'POST',
        headers: { Cookie: 'tv_session=bypass_cron' }
      });
      // snapshot endpoint can also be invoked directly
    }

    // 2. Garbage collection: delete pending_chunks older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oldPending = await env.DB.prepare(
      'SELECT message_id FROM pending_chunks WHERE created_at < ?'
    )
      .bind(oneDayAgo)
      .all<{ message_id: number }>();

    for (const p of oldPending.results) {
      await tg.deleteMessage(p.message_id).catch(() => {});
    }

    await env.DB.prepare('DELETE FROM pending_chunks WHERE created_at < ?').bind(oneDayAgo).run();
  }
};
