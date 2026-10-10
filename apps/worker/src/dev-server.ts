import { serve } from '@hono/node-server';
import worker from './index';
import { createMockD1Database } from './test-d1';
import { Env } from './types';

const port = Number(process.env.PORT) || 8787;
const dbPath = process.env.DB_FILE || ':memory:';
const db = createMockD1Database(dbPath);

const env: Env = {
  DB: db,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-1001234567890',
  ACCESS_TOKEN: process.env.ACCESS_TOKEN || 'test_access_token_min_32_chars_long_xyz',
  SESSION_SECRET: process.env.SESSION_SECRET || 'test_session_secret_min_32_characters_hmac',
  ENVIRONMENT: 'dev',
  TELEGRAM_API_BASE: process.env.TELEGRAM_API_BASE || 'http://127.0.0.1:8788'
};

serve(
  {
    fetch: (req) => worker.fetch(req, env),
    port
  },
  (info) => {
    console.log(`⚡ TeleVault Worker dev server listening on http://127.0.0.1:${info.port}`);
  }
);
