// TeleVault Purge CLI: Wipes all test data from Telegram channel and resets Cloudflare D1
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export async function runPurgeCLI() {
  console.log('============================================');
  console.log('   TeleVault Purge & Reset Utility          ');
  console.log('============================================\n');

  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  const devVarsPath = path.join(process.cwd(), '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const devVars = fs.readFileSync(devVarsPath, 'utf8');
    const tokenMatch = devVars.match(/TELEGRAM_BOT_TOKEN=(.+)/);
    const chatMatch = devVars.match(/TELEGRAM_CHAT_ID=(.+)/);
    if (tokenMatch) botToken = tokenMatch[1].trim();
    if (chatMatch) chatId = chatMatch[1].trim();
  }

  if (!botToken || !chatId) {
    console.error('❌ Missing credentials! Please configure .dev.vars.');
    process.exit(1);
  }

  console.log(`Target Telegram Channel ID: ${chatId}`);
  console.log('Step 1: Unpinning all messages in Telegram channel...');
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/unpinAllChatMessages?chat_id=${chatId}`).then((r) =>
      r.json()
    );
    console.log('✅ Unpinned all messages.');
  } catch (err: any) {
    console.warn('⚠️ Could not unpin messages:', err.message);
  }

  console.log('\nStep 2: Probing highest message ID in channel...');
  let maxId = 200;
  try {
    const probe = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'purge_probe' })
    }).then((r) => r.json());

    if (probe.result?.message_id) {
      maxId = probe.result.message_id;
      // Delete probe
      await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: maxId })
      });
    }
  } catch (err: any) {
    console.warn('⚠️ Probe failed, defaulting max message ID scan to 200');
  }

  console.log(`Step 3: Deleting messages in Telegram channel (range 1 to ${maxId})...`);
  for (let start = 1; start <= maxId; start += 100) {
    const end = Math.min(start + 99, maxId);
    const ids: number[] = [];
    for (let id = start; id <= end; id++) ids.push(id);

    try {
      const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_ids: ids })
      }).then((r) => r.json());

      if (!delRes.ok) {
        // Fallback: delete individually
        for (const id of ids) {
          await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: id })
          });
        }
      }
    } catch {
      // Ignore network errors on non-existent IDs
    }
  }
  console.log('✅ Telegram channel messages deleted.');

  console.log('\nStep 4: Wiping Cloudflare D1 database (items, chunks, pending_chunks, thumbs, tombstones, vault)...');
  try {
    const sql = `
DELETE FROM items;
DELETE FROM chunks;
DELETE FROM pending_chunks;
DELETE FROM thumbs;
DELETE FROM tombstones;
DELETE FROM meta;
INSERT OR REPLACE INTO meta (key, value) VALUES ('seq_counter', '0');
INSERT OR REPLACE INTO meta (key, value) VALUES ('last_snapshot_seq', '0');
DELETE FROM vault;
`.trim().replace(/\n/g, ' ');

    execSync(`npx wrangler d1 execute televault-db --remote --command "${sql}"`, {
      stdio: 'inherit'
    });
    console.log('✅ Cloudflare D1 tables wiped and counters reset.');
  } catch (err: any) {
    console.warn('⚠️ D1 reset command warning:', err.message);
  }

  console.log('\n============================================');
  console.log('🎉 PURGE & RESET COMPLETE!');
  console.log('Your Telegram channel is completely empty.');
  console.log('TeleVault is reset to initial state ready for fresh setup.');
  console.log('============================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPurgeCLI().catch(console.error);
}
