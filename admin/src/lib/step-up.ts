/**
 * Passkey step-up for sensitive admin actions (ban/unban/delete user, loyalty writes, ...).
 * The backend answers 403 `step_up_required` (or `step_up_invalid`) when the signed-in admin has a passkey and sent
 * no valid `X-Step-Up-Token`. The token is bound to `METHOD:/api/v1/<path>` (what the backend reads as req.method + req.path),
 * so it is asked for the exact call that was refused, and the call is retried once with it.
 */
export const STEP_UP_HEADER = 'x-step-up-token';

export function isStepUpRefusal(status: number, payload: unknown): boolean {
  if (status !== 403 || !payload || typeof payload !== 'object') return false;
  const p = payload as { message?: unknown; code?: unknown };
  const code = typeof p.message === 'string' ? p.message : typeof p.code === 'string' ? p.code : '';
  return code === 'step_up_required' || code === 'step_up_invalid';
}

/** The action string the backend binds the token to: `METHOD:/api/v1/<path>`, no query, segments encoded as the proxy sends them. */
export function stepUpAction(method: string, bffPath: string): string {
  const withoutQuery = bffPath.split('?')[0];
  const rest = withoutQuery.replace(/^\/api\/admin\//, '');
  const encoded = rest.split('/').map((segment) => {
    try { return encodeURIComponent(decodeURIComponent(segment)); } catch { return segment; }
  }).join('/');
  return `${method.toUpperCase()}:/api/v1/${encoded}`;
}

interface StepUpDeps {
  post: (path: string, body?: unknown) => Promise<any>;
  email: () => Promise<string>;
  assert: (optionsJSON: any) => Promise<any>;
}

/** Runs the passkey ceremony and returns a short-lived token for `action`. */
export async function requestStepUpToken(action: string, deps: StepUpDeps): Promise<string> {
  const options = await deps.post('/api/admin/auth/step-up/options');
  const response = await deps.assert(options);
  const identifier = await deps.email();
  const issued = await deps.post('/api/admin/auth/step-up/issue', { identifier, action, response });
  if (!issued || typeof issued.token !== 'string' || !issued.token) throw new Error('step_up_token_missing');
  return issued.token;
}
