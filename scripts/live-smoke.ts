// TeleVault Live Smoke Test CLI
import { TelegramClient } from '../apps/worker/src/telegram';
import { runDoctor } from '../apps/worker/src/doctor';
import {
  createVault,
  deriveSubkey,
  encryptChunk,
  decryptChunk,
  randomBytes,
  bytesToHex
} from '@televault/crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function runLiveSmokeCLI() {
  console.log('============================================');
  console.log('   TeleVault Live Smoke Test (Telegram)     ');
  console.log('============================================\n');

  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;
  const envMode = process.env.ENVIRONMENT || 'dev';
  const apiBase = process.env.TELEGRAM_API_BASE;

  const devVarsPath = path.join(process.cwd(), '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const devVars = fs.readFileSync(devVarsPath, 'utf8');
    const tokenMatch = devVars.match(/TELEGRAM_BOT_TOKEN=(.+)/);
    const chatMatch = devVars.match(/TELEGRAM_CHAT_ID=(.+)/);
    if (tokenMatch) botToken = tokenMatch[1].trim();
    if (chatMatch) chatId = chatMatch[1].trim();
  }

  if (!botToken || !chatId) {
    console.error('❌ Missing credentials! Please run `npm run setup` first.');
    process.exit(1);
  }

  const tg = new TelegramClient({
    DB: null as any,
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: chatId,
    ACCESS_TOKEN: '',
    SESSION_SECRET: '',
    ENVIRONMENT: envMode,
    TELEGRAM_API_BASE: apiBase
  });

  // 1. Run Doctor Check
  console.log('Step 1: Running Telegram Doctor diagnostics...');
  const doctorReport = await runDoctor(tg);
  if (!doctorReport.ok) {
    console.error('❌ Doctor check failed! Please fix your Telegram channel configuration.');
    process.exit(1);
  }
  console.log('✅ Doctor check passed (channel is private, bot is admin).\n');

  // 2. Ephemeral Vault & Test Ciphertext
  console.log('Step 2: Generating ephemeral test vault and test chunk...');
  const testPass = 'ephemeral-smoke-test-passphrase-2026';
  const { masterKey } = await createVault(testPass, 100_000);

  const fileIdBytes = randomBytes(16);
  const fileIdHex = bytesToHex(fileIdBytes);
  const fileKey = await deriveSubkey(masterKey, `file/${fileIdHex}`);

  const samplePlaintext = new TextEncoder().encode(
    'TeleVault Live Smoke Test payload verified at ' + new Date().toISOString()
  );

  const encryptedChunk = await encryptChunk(fileKey, fileIdBytes, 0, 1, samplePlaintext);
  console.log(`✅ Chunk encrypted: ${encryptedChunk.length} bytes (IV + Ciphertext + Tag)\n`);

  // 3. Upload to Real Telegram Channel
  console.log('Step 3: Uploading encrypted test document to Telegram channel...');
  const uploadRes = await tg.sendDocument(
    encryptedChunk,
    `${fileIdHex}.bin`
  );
  console.log(`✅ Uploaded to Telegram! Message ID: ${uploadRes.messageId}, File ID: ${uploadRes.fileId}\n`);

  // 4. Download from Telegram & Decrypt
  console.log('Step 4: Downloading chunk from Telegram and decrypting in WebCrypto...');
  const filePath = await tg.getFile(uploadRes.fileId);
  const streamRes = await tg.getDownloadStream(filePath);
  const downloadedBytes = new Uint8Array(await streamRes.arrayBuffer());
  const decryptedBytes = await decryptChunk(fileKey, fileIdBytes, 0, 1, downloadedBytes);

  const decryptedText = new TextDecoder().decode(decryptedBytes);
  const expectedText = new TextDecoder().decode(samplePlaintext);

  if (decryptedText !== expectedText) {
    throw new Error('Decrypted payload mismatch! Integrity verification failed.');
  }
  console.log(`✅ Decryption successful! Verified payload: "${decryptedText}"\n`);

  // 5. Clean up Telegram Message
  console.log('Step 5: Cleaning up test message from Telegram channel...');
  await tg.deleteMessage(uploadRes.messageId);
  console.log(`✅ Test message ${uploadRes.messageId} deleted successfully.\n`);

  console.log('============================================');
  console.log('🎉 LIVE SMOKE TEST 100% SUCCESSFUL!');
  console.log('Telegram storage, bot API, encryption, and chunk cleanup verified.');
  console.log('============================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveSmokeCLI().catch((err) => {
    console.error('❌ Live smoke test failed:', err);
    process.exit(1);
  });
}
