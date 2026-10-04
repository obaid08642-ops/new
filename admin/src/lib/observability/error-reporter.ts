/**
 * 15.5 — crash and error reporting for the admin, with releases.
 *
 * Design constraints:
 * - The Sentry DSN is an owner secret, so it is read from the environment and an
 *   empty DSN means "reporting disabled" — never a hard failure and never a
 *   hard-coded DSN (the same convention the backend uses in
 *   `backend/src/instrument.ts` and patient-web in `sentry.client.config.ts`).
 * - Even with reporting disabled, every captured error is kept in a bounded
 *   in-memory ring buffer and given a stable `errorId`. The fallback UI shows
 *   that id, so an operator can quote it and a support session can read the same
 *   id out of the buffer — the "contact support" path works with no DSN set.
 * - The release is resolved the same way on the client and on the server so a
 *   report from an operator's browser is filed against the exact build they ran.
 */

/** How many recent errors to keep for the support hand-off. */
const BUFFER_LIMIT = 50;

export type AdminErrorContext = Record<string, unknown>;

export interface ReportedError {
  errorId: string;
  release: string;
  environment: string;
  /** Present only when a transport accepted the event. */
  delivered: boolean;
  context: AdminErrorContext;
  error: unknown;
  at: string;
}

export interface ErrorTransport {
  /** Name shown in the buffer so support can tell where an event went. */
  readonly name: string;
  capture(event: { error: unknown; release: string; environment: string; context: AdminErrorContext }): void | Promise<void>;
}

const buffer: ReportedError[] = [];

/**
 * Release string. `SENTRY_RELEASE` wins (CI sets it from the git SHA); otherwise
 * a version-only release is derived so a local build is still distinguishable
 * from production rather than showing up as "no release".
 */
export function resolveRelease(env: Record<string, string | undefined> = process.env): string {
  const explicit = (env.SENTRY_RELEASE || '').trim();
  if (explicit) return explicit;
  const version = (env.ADMIN_APP_VERSION || '').trim();
  return version ? `web-admin@${version}` : 'web-admin@dev';
}

export function resolveEnvironment(env: Record<string, string | undefined> = process.env): string {
  return (env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development').trim() || 'development';
}

/** Support address for the "contact support" action; env-configurable. */
export function resolveSupportEmail(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL || 'support@nabd.plus').trim();
}

function makeErrorId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') return globalCrypto.randomUUID();
  // Deterministic fallback for a runtime without WebCrypto.
  return `err-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

let transport: ErrorTransport | null = null;

/** Installed by `sentry.*.config.ts` (client and server) at startup. */
export function setErrorTransport(next: ErrorTransport | null): void {
  transport = next;
}

export function getErrorTransport(): ErrorTransport | null {
  return transport;
}

function record(entry: ReportedError): void {
  buffer.unshift(entry);
  if (buffer.length > BUFFER_LIMIT) buffer.length = BUFFER_LIMIT;
}

/**
 * Capture one error. Returns what was recorded so a caller (an error boundary)
 * can show the id. Never throws: a reporting failure must not replace the error
 * the operator was already trying to read.
 */
export async function reportError(error: unknown, context: AdminErrorContext = {}): Promise<ReportedError> {
  const release = resolveRelease();
  const environment = resolveEnvironment();
  const entry: ReportedError = {
    errorId: makeErrorId(),
    release,
    environment,
    delivered: false,
    context,
    error,
    at: new Date().toISOString(),
  };

  try {
    if (transport) {
      await transport.capture({ error, release, environment, context });
      entry.delivered = true;
    }
  } catch (captureError) {
    // eslint-disable-next-line no-console -- last-resort visibility, matches backend practice
    console.error('admin_error_report_transport_failed', captureError);
  }

  // Server-side breadcrumb for the ops log even when no DSN is configured.
  if (typeof window === 'undefined') {
    // eslint-disable-next-line no-console
    console.error('admin_ui_error', { errorId: entry.errorId, release, context });
  }

  record(entry);
  return entry;
}

/** Most recent first. Used by the support hand-off, never rendered to users. */
export function recentErrors(): readonly ReportedError[] {
  return buffer;
}

export function clearRecordedErrors(): void {
  buffer.length = 0;
}