// TeleVault Disaster Recovery: Restore D1 from Telegram Pinned Snapshot

import { unpackSnapshotPart, VaultHeader } from '@televault/crypto';

export interface RestoreResult {
  ok: boolean;
  vaultHeader: VaultHeader;
  itemsRestored: number;
}

export async function restoreFromTelegram(
  botToken: string,
  chatId: string,
  d1Db: D1Database,
  telegramApiBase = 'https://api.telegram.org'
): Promise<RestoreResult> {
  const baseUrl = telegramApiBase.replace(/\/+$/, '');

  // 1. getChat to find pinned_message
  const chatRes = await fetch(`${baseUrl}/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`);
  const chatData = (await chatRes.json()) as any;

  if (!chatData.ok || !chatData.result?.pinned_message) {
    throw new Error('No pinned message found in channel or failed to access channel');
  }

  const pinnedMsg = chatData.result.pinned_message;
  if (!pinnedMsg.document?.file_id) {
    throw new Error('Pinned message does not contain a document');
  }

  // 2. Download snapshot head JSON
  const headFileRes = await fetch(
    `${baseUrl}/bot${botToken}/getFile?file_id=${encodeURIComponent(pinnedMsg.document.file_id)}`
  );
  const headFileData = (await headFileRes.json()) as any;
  if (!headFileData.ok || !headFileData.result?.file_path) {
    throw new Error('Failed to resolve snapshot head file path');
  }

  const headDownloadRes = await fetch(
    `${baseUrl}/file/bot${botToken}/${headFileData.result.file_path}`
  );
  const headDoc = (await headDownloadRes.json()) as {
    v: number;
    seq: number;
    parts: Array<{ fileId: string; size: number; itemCount: number }>;
  };

  if (!headDoc.parts || headDoc.parts.length === 0) {
    throw new Error('Snapshot head document has no parts');
  }

  let restoredVaultHeader: VaultHeader | null = null;
  let totalRestored = 0;
  let maxSeq = headDoc.seq || 0;

  // 3. Download and unpack each snapshot part
  for (const part of headDoc.parts) {
    const partFileRes = await fetch(
      `${baseUrl}/bot${botToken}/getFile?file_id=${encodeURIComponent(part.fileId)}`
    );
    const partFileData = (await partFileRes.json()) as any;
    const partDownloadRes = await fetch(
      `${baseUrl}/file/bot${botToken}/${partFileData.result.file_path}`
    );
    const partBytes = new Uint8Array(await partDownloadRes.arrayBuffer());

    const { vaultHeader, items } = unpackSnapshotPart(partBytes);
    restoredVaultHeader = vaultHeader;

    // Write vault header if not already inserted
    await d1Db
      .prepare('INSERT OR REPLACE INTO vault (id, header, rev, created_at) VALUES (1, ?, ?, ?)')
      .bind(JSON.stringify(vaultHeader), vaultHeader.rev, vaultHeader.createdAt)
      .run();

    // Insert items in batch
    const statements: D1PreparedStatement[] = [];
    for (const item of items) {
      if (item.seq > maxSeq) maxSeq = item.seq;
      const manifestStr = new TextDecoder().decode(item.manifestBlob);
      statements.push(
        d1Db
          .prepare(
            'INSERT OR REPLACE INTO items (id, seq, rev, manifest, size_bytes, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(item.id, item.seq, item.rev, manifestStr, 0, 1, Date.now())
      );
    }

    if (statements.length > 0) {
      await d1Db.batch(statements);
      totalRestored += items.length;
    }
  }

  // Update seq counter and last snapshot seq
  await d1Db.batch([
    d1Db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seq_counter', ?)")
      .bind(maxSeq.toString()),
    d1Db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_snapshot_seq', ?)")
      .bind(maxSeq.toString())
  ]);

  return {
    ok: true,
    vaultHeader: restoredVaultHeader!,
    itemsRestored: totalRestored
  };
}
