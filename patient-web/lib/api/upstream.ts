import { apiFetch, defaultSleep, type ApiFetchOptions } from "./net/client";
import { TIMEOUTS, requestKind, timeoutForRequest } from "./net/policy";

const API_BASE_URL = (
  process.env.NABD_API_BASE_URL ||
  process.env.INTERNAL_API_BASE_URL ||
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NODE_ENV === "production" ? "http://nabdah-backend:8002/api/v1" : "http://localhost:8002/api/v1")
).replace(/\/$/, "");

export function patientApiUrl(path: string) {
  if (!path.startsWith("/") || path.includes("..")) throw new Error("invalid_patient_api_path");
  return `${API_BASE_URL}${path}`;
}

/** Flattens any `HeadersInit` into a plain record. */
function headerRecord(init: RequestInit): Record<string, string> {
  const raw = init.headers;
  if (!raw) return {};
  if (raw instanceof Headers) return Object.fromEntries(raw.entries());
  if (Array.isArray(raw)) return Object.fromEntries(raw.map(([key, value]) => [key, value]));
  return { ...(raw as Record<string, string>) };
}

/**
 * P15.1 — the one server-side HTTP client.
 *
 * Throws on a transport failure, exactly like `fetch`, so every caller's
 * existing `try { ... } catch { return null }` keeps working unchanged. Every
 * server-side read that used to call `fetch(patientApiUrl(...))` directly now
 * comes through here and therefore inherits the 15 s / 60 s / 45 s deadline, the
 * safe-method-or-idempotency-key retry rule, jittered backoff with
 * `Retry-After`, and the caller-abort wiring.
 *
 * Headers stay a plain record on purpose: the public-catalog wrappers are
 * covered by tests that assert the exact header object they send (that no
 * `Authorization` leaks onto a public route), and turning them into a `Headers`
 * instance would break those assertions for no functional gain.
 */
export function patientUpstreamFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const existing = headerRecord(init);
  const merged: Record<string, string> = {};
  for (const [name, value] of Object.entries(existing)) {
    // Drop any casing variant so the entries below cannot be duplicated.
    if (name.toLowerCase() === "accept" || name.toLowerCase() === "authorization") continue;
    merged[name] = value;
  }
  merged.Accept = "application/json";
  if (accessToken) merged.Authorization = `Bearer ${accessToken}`;
  // fetch() labels a string body text/plain, which the API's JSON parser ignores (the handler then sees {}).
  const hasContentType = Object.keys(merged).some((name) => name.toLowerCase() === "content-type");
  if (typeof init.body === "string" && !hasContentType) merged["content-type"] = "application/json";

  return apiFetch(patientApiUrl(path), { ...init, headers: merged }, {
    // A Next request that never sees a response is an upstream problem, not a
    // user-visible "try again", so the legacy 503 shape is preserved below.
    ...options,
    isOffline: () => false,
    sleep: options.sleep ?? defaultSleep,
  });
}

export async function callPatientApi(path: string, init: RequestInit = {}, accessToken?: string | null) {
  try {
    return await patientUpstreamFetch(path, { ...init, cache: "no-store" }, accessToken);
  } catch {
    return new Response(null, { status: 503, statusText: "upstream_unavailable" });
  }
}

/** Exposed so the deadline numbers are assertable from one place. */
export const UPSTREAM_TIMEOUTS = TIMEOUTS;
export const upstreamTimeoutFor = (path: string, init?: RequestInit) => timeoutForRequest(patientApiUrl(path), init);
export const upstreamRequestKind = (path: string, init?: RequestInit) => requestKind(patientApiUrl(path), init);
