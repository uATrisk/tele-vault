// Authentication, constant-time compare, session cookies, and rate limiting

import { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Env } from './types';

export const SESSION_COOKIE_NAME = 'tv_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// In-memory / per-isolate rate limiter for login failures
const loginFailures = new Map<string, { count: number; resetAt: number }>();

// General API request rate limiter (max 300 requests per 60 seconds per IP)
const apiRequests = new Map<string, { count: number; resetAt: number }>();

export function checkGeneralRateLimit(ip: string, maxRequests = 300): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = apiRequests.get(ip);

  if (entry) {
    if (now > entry.resetAt) {
      apiRequests.set(ip, { count: 1, resetAt: now + 60 * 1000 });
      return { allowed: true };
    }
    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter: retryAfterSec };
    }
    return { allowed: true };
  }

  apiRequests.set(ip, { count: 1, resetAt: now + 60 * 1000 });
  return { allowed: true };
}

/**
 * Constant-time comparison of two strings using HMAC-SHA256 digests.
 */
export async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const dummyKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigA = await crypto.subtle.sign('HMAC', dummyKey, enc.encode(a));
  const sigB = await crypto.subtle.sign('HMAC', dummyKey, enc.encode(b));

  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);

  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Creates an HMAC-SHA256 signature for a session payload.
 */
export async function signSession(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${payload}.${sigHex}`;
}

/**
 * Verifies an HMAC-SHA256 session token.
 */
export async function verifySession(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, expectedSig] = parts;

  const validToken = await signSession(payload, secret);
  return constantTimeCompare(token, validToken);
}

/**
 * Checks and updates login failure rate limiting.
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginFailures.get(ip);

  if (entry) {
    if (now > entry.resetAt) {
      loginFailures.delete(ip);
    } else if (entry.count >= 5) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter: retryAfterSec };
    }
  }

  return { allowed: true };
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const entry = loginFailures.get(ip);
  if (!entry || now > entry.resetAt) {
    loginFailures.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    entry.count++;
  }
}

export function resetLoginFailure(ip: string) {
  loginFailures.delete(ip);
}

/**
 * Middleware: Enforces authentication and rate limiting on all protected routes.
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const path = c.req.path;

  // Allow public health and login routes
  if (path === '/api/health' || path === '/api/auth/login') {
    return next();
  }

  // 1. General API Rate Limiting per IP
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkGeneralRateLimit(ip);
  if (!rateLimit.allowed) {
    return c.json(
      { ok: false, error: `Too many requests. Please slow down and retry in ${rateLimit.retryAfter}s.` },
      429
    );
  }

  // 2. Strict Origin verification for state-changing requests (CSRF Defense-in-Depth)
  const origin = c.req.header('origin');
  if (origin && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
    try {
      const originHost = new URL(origin).host;
      const reqHost = c.req.header('host');
      if (reqHost && originHost !== reqHost && c.env.ENVIRONMENT !== 'dev') {
        return c.json({ ok: false, error: 'Forbidden: cross-origin request rejected' }, 403);
      }
    } catch {
      return c.json({ ok: false, error: 'Forbidden: invalid origin header' }, 403);
    }
  }

  // 3. Session Cookie Authentication
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return c.json({ ok: false, error: 'Unauthorized: missing session' }, 401);
  }

  const isValid = await verifySession(sessionCookie, c.env.SESSION_SECRET);
  if (!isValid) {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return c.json({ ok: false, error: 'Unauthorized: invalid or expired session' }, 401);
  }

  return next();
};

export async function setSessionCookie(c: Context<{ Bindings: Env }>) {
  const payload = `uid_${Date.now()}`;
  const signed = await signSession(payload, c.env.SESSION_SECRET);

  setCookie(c, SESSION_COOKIE_NAME, signed, {
    path: '/',
    httpOnly: true,
    secure: c.env.ENVIRONMENT !== 'dev', // Secure in production
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE
  });
}

export function clearSessionCookie(c: Context<{ Bindings: Env }>) {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: c.env.ENVIRONMENT !== 'dev',
    sameSite: 'Strict'
  });
}
