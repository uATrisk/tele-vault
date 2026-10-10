import { serve } from '@hono/node-server';
import worker from './index';
import { createMockD1Database } from './test-d1';
import { Env } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Auto-load .dev.vars from current or parent directories
const candidateVars = [
  path.resolve(process.cwd(), '.dev.vars'),
  path.resolve(process.cwd(), '../../.dev.vars'),
  path.resolve(__dirname, '../.dev.vars'),
  path.resolve(__dirname, '../../../.dev.vars')
];

for (const p of candidateVars) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const l of lines) {
      const match = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
}

const port = Number(process.env.PORT) || 8787;
const dbPath = process.env.DB_FILE || path.resolve(process.cwd(), '.local-dev.sqlite');
const db = createMockD1Database(dbPath);

const botToken = process.env.TELEGRAM_BOT_TOKEN || '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ';
const isMock = botToken.startsWith('123456789:');

const env: Env = {
  DB: db,
  TELEGRAM_BOT_TOKEN: botToken,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-1001234567890',
  ACCESS_TOKEN: process.env.ACCESS_TOKEN || 'test_access_token_min_32_chars_long_xyz',
  SESSION_SECRET: process.env.SESSION_SECRET || 'test_session_secret_min_32_characters_hmac',
  ENVIRONMENT: 'dev',
  TELEGRAM_API_BASE: process.env.TELEGRAM_API_BASE || (isMock ? 'http://127.0.0.1:8788' : undefined)
};

serve(
  {
    fetch: (req) => worker.fetch(req, env),
    port
  },
  (info) => {
    console.log(`⚡ TeleVault Worker dev server listening on http://127.0.0.1:${info.port}`);
    if (!isMock) {
      console.log(`📡 Connected to Live Telegram Channel (${env.TELEGRAM_CHAT_ID})`);
    } else {
      console.log('🤖 Connected to Local Mock Telegram Server');
    }
  }
);
