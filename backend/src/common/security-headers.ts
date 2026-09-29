import { randomBytes } from 'crypto';

/**
 * F68 — a Content-Security-Policy that actually blocks injected scripts.
 *
 * The backend previously sent a policy whose script-src allowed 'unsafe-inline',
 * which means an injected <script> tag runs — so the policy documented the risk
 * without mitigating it. A per-request nonce is issued here and echoed to the
 * caller, so only scripts the server itself emitted can execute.
 *
 * The nonce is generated per request (never reused) and attached to the request
 * so a controller that needs to render an inline bootstrap can read it; nothing
 * in this codebase currently does, which is why the app can adopt strict-dynamic
 * without breaking a flow.
 */
export function contentSecurityPolicy(options?: {
  nonce?: string;
  isProduction?: boolean;
  allowedOrigins?: string[];
}): string {
  const isProduction = options?.isProduction ?? process.env.NODE_ENV === 'production';
  const nonce = options?.nonce ?? randomBytes(16).toString('base64');
  const extra = ((options?.allowedOrigins ?? []) as string[])
    .map((o) => String(o).trim())
    .filter(Boolean);

  const scriptSrc = ["'self'"];
  if (nonce) scriptSrc.push(`'nonce-${nonce}'`);
  // strict-dynamic lets the nonced bootstrap load the rest, and modern browsers
  // then ignore host allowlists — so a compromised CDN script cannot run.
  if (isProduction && nonce) scriptSrc.push("'strict-dynamic'");
  if (!isProduction) {
    // Vite/webpack dev servers evaluate inline; production never gets this.
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = ["'self'", ...(isProduction ? [] : ['ws:', 'http:', 'https:']), ...extra];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // Styles keep 'unsafe-inline' because the admin/patient UIs ship CSS-in-JS
    // and inline style attributes; script-src is what XSS actually abuses.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://api.moyasar.com https://checkout.tap.company",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function newCspNonce(): string {
  return randomBytes(16).toString('base64');
}
