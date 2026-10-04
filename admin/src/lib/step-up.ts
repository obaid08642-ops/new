import { startAuthentication } from '@simplewebauthn/browser';
import { AdminApiError } from './admin-client';
import { apiFetch, fetchWithAdminGuard } from '../utils/api';

/**
 * R23a — admin step-up (passkey re-authentication) client flow.
 *
 * Backend contract (read from backend/src/modules/auth/step-up.controller.ts
 * and backend/src/common/step-up.guard.ts — this file only consumes it):
 * - Sensitive routes marked @StepUp() require an `x-step-up-token` header.
 * - The guard verifies `METHOD:/api/v1/<path>` (e.g. `POST:/api/v1/admin/...`).
 * - A token is issued by `POST /api/v1/auth/step-up/issue` with
 *   `{ identifier, action, response }` where `response` is a fresh WebAuthn
 *   assertion and `action` is the exact `METHOD:path` string the guard checks.
 * - Tokens are short-lived (120s), single-use, action-bound.
 * - Missing/invalid token → 403 `step_up_required` / `step_up_invalid`.
 *
 * Tokens live ONLY in this module's memory Map — never localStorage /
 * sessionStorage / cookies — so a stolen disk/profile cannot replay them.
 */

export const STEP_UP_HEADER = 'x-step-up-token';
const STEP_UP_TTL_MS = 120_000;
const STEP_UP_OPTIONS_PATH = '/api/admin/auth/step-up/options';
const STEP_UP_ISSUE_PATH = '/api/admin/auth/step-up/issue';

export type StepUpCode =
  | 'step_up_unavailable'
  | 'no_passkey'
  | 'cancelled'
  | 'ceremony_failed';

export class StepUpError extends Error {
  readonly code: StepUpCode;
  constructor(code: StepUpCode, message: string) {
    super(message);
    this.name = 'StepUpError';
    this.code = code;
  }
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** In-memory only. Module scope = per-page-load, never persisted. */
const tokenCache = new Map<string, CachedToken>();
let cachedIdentifier: string | null = null;

export function backendActionFor(method: string, bffPath: string): string | null {
  const upper = String(method || 'GET').toUpperCase();
  const pathOnly = String(bffPath || '').split('?')[0].split('#')[0];
  const prefix = '/api/admin/';
  if (!pathOnly.startsWith(prefix)) return null;
  let rest = pathOnly.slice(prefix.length);
  try {
    rest = decodeURIComponent(rest);
  } catch {
    // Keep the raw form rather than failing the whole action.
  }
  if (!rest) return null;
  return `${upper}:/api/v1/${rest}`;
}

function payloadText(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = record.message;
    const code = record.code;
    const parts: string[] = [];
    if (typeof code === 'string') parts.push(code);
    if (typeof message === 'string') parts.push(message);
    if (Array.isArray(message)) parts.push(message.filter((m) => typeof m === 'string').join(' '));
    return parts.join(' ');
  }
  return '';
}

/** True only for step-up 403s — never for CSRF/RBAC/session errors. */
export function isStepUpError(error: unknown): boolean {
  if (error instanceof StepUpError) return false;
  if (error instanceof AdminApiError) {
    if (error.status !== 403) return false;
    return payloadText(error.payload).includes('step_up');
  }
  if (error instanceof Error) {
    const text = error.message || '';
    if (text.includes('csrf') || text.includes('CSRF')) return false;
    return text.includes('step_up_required') || text.includes('step_up_invalid');
  }
  return false;
}

export function peekStepUpToken(action: string): string | null {
  const cached = tokenCache.get(action);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    tokenCache.delete(action);
    return null;
  }
  return cached.token;
}

/** Single-use: reading consumes the token. */
export function takeStepUpToken(action: string): string | null {
  const token = peekStepUpToken(action);
  if (token) tokenCache.delete(action);
  return token;
}

export function clearStepUpToken(action: string): void {
  tokenCache.delete(action);
}

async function postBffJSON(path: string, body: unknown): Promise<{ status: number; payload: unknown }> {
  const response = await fetchWithAdminGuard(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function getStepUpIdentifier(): Promise<string> {
  if (cachedIdentifier) return cachedIdentifier;
  const me = await apiFetch<{ email?: string; user?: { email?: string } }>('/auth/me');
  const email = String(me?.email || me?.user?.email || '').trim().toLowerCase();
  if (!email) throw new StepUpError('ceremony_failed', 'تعذر تحديد البريد الإداري لجلسة الإدارة الحالية.');
  cachedIdentifier = email;
  return email;
}

/**
 * Full ceremony: options → browser passkey prompt → issue → token.
 * Throws StepUpError (never loops — one attempt per call).
 */
export async function requestStepUpToken(action: string): Promise<string> {
  const identifier = await getStepUpIdentifier();

  // 1) Challenge options. Contract endpoint for the backend wave:
  //    POST /api/v1/auth/step-up/options → { options } and stores the
  //    `webauthn_stepup:{userId}` challenge the issue endpoint verifies.
  const optionsRes = await postBffJSON(STEP_UP_OPTIONS_PATH, {});
  if (optionsRes.status === 404) {
    throw new StepUpError(
      'step_up_unavailable',
      'التحقق المشدّد غير متاح بعد على الخادم (auth/step-up/options مفقود).',
    );
  }
  const optionsText = payloadText(optionsRes.payload);
  if (optionsRes.status !== 200 || !optionsRes.payload || typeof optionsRes.payload !== 'object') {
    if (optionsText.includes('no_passkey') || optionsText.includes('existing_passkey_required')) {
      throw new StepUpError('no_passkey', 'لا يوجد مفتاح أمان مسجّل لهذا الحساب.');
    }
    throw new StepUpError('ceremony_failed', optionsText || 'تعذر بدء التحقق بمفتاح الأمان.');
  }
  const container = optionsRes.payload as Record<string, unknown>;
  const optionsJSON = (container.options ?? container) as never;
  if (!optionsJSON || typeof optionsJSON !== 'object' || !('challenge' in (optionsJSON as object))) {
    throw new StepUpError('step_up_unavailable', 'استجابة التحقق المشدّد غير صالحة من الخادم.');
  }

  // 2) Browser WebAuthn ceremony (same pattern as admin login passkey step).
  let assertion: unknown;
  try {
    assertion = await startAuthentication({ optionsJSON });
  } catch (reason: unknown) {
    const name = (reason as { name?: string } | null)?.name;
    if (name === 'NotAllowedError') {
      throw new StepUpError('cancelled', 'تم إلغاء التحقق بمفتاح الأمان.');
    }
    throw new StepUpError('ceremony_failed', 'فشل التحقق بمفتاح الأمان.');
  }

  // 3) Exchange the fresh assertion for an action-bound token.
  const issueRes = await postBffJSON(STEP_UP_ISSUE_PATH, { identifier, action, response: assertion });
  const issueText = payloadText(issueRes.payload);
  const issueBody = (issueRes.payload || {}) as Record<string, unknown>;
  if (issueRes.status === 200 && typeof issueBody.token === 'string' && issueBody.token) {
    tokenCache.set(action, { token: issueBody.token, expiresAt: Date.now() + STEP_UP_TTL_MS });
    return issueBody.token;
  }
  if (issueText.includes('challenge_expired')) {
    // No fresh challenge on the server (options endpoint not issuing
    // `webauthn_stepup:*` yet) — do NOT retry in a loop.
    throw new StepUpError(
      'step_up_unavailable',
      'انتهت صلاحية تحدّي التحقق (خادم auth/step-up/options غير مكتمل بعد).',
    );
  }
  if (issueText.includes('unknown_credential') || issueText.includes('no_passkey')) {
    throw new StepUpError('no_passkey', 'مفتاح الأمان هذا غير مسجّل — سجّل جهازك أولاً.');
  }
  throw new StepUpError('ceremony_failed', issueText || 'فشل إصدار رمز التحقق المشدّد.');
}

/**
 * Run a request, handling step-up 403s: challenge once via `ensureToken`,
 * retry the original request a single time with the fresh token, then surface
 * any further error (never loops, never persists the token).
 */
export async function withStepUp<T>(
  bffPath: string,
  method: string,
  run: (extraHeaders: Record<string, string>) => Promise<T>,
  ensureToken: (action: string) => Promise<string | null>,
): Promise<T> {
  const action = backendActionFor(method, bffPath);
  const cached = action ? takeStepUpToken(action) : null;
  try {
    return await run(cached ? { [STEP_UP_HEADER]: cached } : {});
  } catch (error) {
    if (!action || !isStepUpError(error)) throw error;
    const fresh = await ensureToken(action);
    if (!fresh) throw error; // user cancelled / unavailable → surface original 403
    try {
      const result = await run({ [STEP_UP_HEADER]: fresh });
      tokenCache.delete(action);
      return result;
    } catch (retryError) {
      // Single retry only: drop the (now spent/expired) token and surface.
      clearStepUpToken(action);
      throw retryError;
    }
  }
}
