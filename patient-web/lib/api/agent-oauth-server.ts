import { callPatientApi } from "./upstream";

/** AC-1: OAuth 2.1 for AI assistants. The backend validates and decides; the web only relays. */
export const AUTHORIZE_PARAMS = [
  "response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "scope", "state", "resource",
] as const;
export type AuthorizeParam = (typeof AUTHORIZE_PARAMS)[number];
export type AuthorizeRequest = Partial<Record<AuthorizeParam, string>>;

export type AgentConsent = {
  client: { client_id: string; client_name: string; client_uri?: string; logo_uri?: string };
  scopes: string[];
  redirect_uri: string;
};

/** Keeps only the OAuth parameters (single string values, bounded). */
export function pickAuthorizeParams(input: Record<string, unknown>): AuthorizeRequest {
  const out: AuthorizeRequest = {};
  for (const key of AUTHORIZE_PARAMS) {
    const v = input[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === "string" && value.length <= 2048) out[key] = value;
  }
  return out;
}

export async function getAgentConsent(token: string, params: AuthorizeRequest): Promise<Response> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return callPatientApi(`/oauth/authorize?${qs}`, {}, token);
}

export async function decideAgentConsent(token: string, params: AuthorizeRequest, decision: "approve" | "deny"): Promise<Response> {
  return callPatientApi("/oauth/authorize", { method: "POST", body: JSON.stringify({ ...params, decision }) }, token);
}

/** RFC 8414 / RFC 9728 documents, exactly as the backend serves them (never built here). */
export async function getOAuthDocument(kind: "metadata" | "protected-resource"): Promise<Response> {
  return callPatientApi(`/oauth/${kind}`);
}
