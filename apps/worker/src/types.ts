// Cloudflare Worker Bindings and Internal Types

export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ACCESS_TOKEN: string;
  SESSION_SECRET: string;
  ENVIRONMENT?: string;
  TELEGRAM_API_BASE?: string;
}

export interface DoctorCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheckResult[];
}
