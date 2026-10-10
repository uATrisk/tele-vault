// TeleVault Doctor CLI: Runs diagnostics on Telegram bot & channel
import { TelegramClient } from '../apps/worker/src/telegram';
import { runDoctor } from '../apps/worker/src/doctor';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function runDoctorCLI() {
  console.log('============================================');
  console.log('   TeleVault Telegram Diagnostics Doctor    ');
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
    console.error('❌ Missing credentials! Please run `npm run setup` first or configure .dev.vars.');
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

  console.log(`Checking bot connection and channel (${chatId})...\n`);
  const report = await runDoctor(tg);

  for (const check of report.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} [${check.name.toUpperCase()}]: ${check.detail}`);
  }

  console.log('\n--------------------------------------------');
  if (report.ok) {
    console.log('🎉 DOCTOR CHECK PASSED: Your Telegram channel and bot are correctly configured!');
  } else {
    console.error('🚨 DOCTOR CHECK FAILED: Please fix the issues above before proceeding.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDoctorCLI();
}
