/**
 * R23: every @StepUp backend route answers 403 step_up_required until a fresh
 * passkey assertion is exchanged for a token. Wiring the prompt page by page
 * left most of them (ban/unban, loyalty, returns, commissions, insurers,
 * impersonation...) failing with no prompt. The shared admin fetch helpers now
 * route a step-up 403 through one registered prompt (GlobalStepUp in _app) and
 * retry the request once with the token.
 */
export const STEP_UP_HEADER = 'x-step-up-token';

export type StepUpPrompt = (action: string) => Promise<string | null>;

let prompt: StepUpPrompt | null = null;

export function setStepUpPrompt(next: StepUpPrompt | null): void {
  prompt = next;
}

/** The `METHOD:/api/v1/<path>` string the backend StepUpGuard binds a token to. */
export function stepUpActionFor(method: string, bffPath: string): string | null {
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

/** Sends once; on a step-up 403 asks the registered prompt and resends once with the token. */
export async function sendWithStepUp(
  method: string,
  bffPath: string,
  headers: Headers,
  send: (headers: Headers) => Promise<Response>,
): Promise<Response> {
  const response = await send(headers);
  if (response.status !== 403 || !prompt || headers.has(STEP_UP_HEADER)) return response;
  const text = await response.clone().text().catch(() => '');
  if (!/step_up_(required|invalid)/.test(text)) return response;
  const action = stepUpActionFor(method, bffPath);
  if (!action) return response;
  const token = await prompt(action);
  if (!token) return response;
  const retry = new Headers(headers);
  retry.set(STEP_UP_HEADER, token);
  return send(retry);
}
