import { MAX_RETRIES, pause, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from "./request-policy";

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

/** `timeoutMs` overrides the default for one call (15 s; 60 s for an upload; 45 s for the AI routes). */
export type PatientApiInit = RequestInit & { timeoutMs?: number };

/**
 * One call to the backend under the request policy (15.1): a timeout, cancellation through `init.signal` (pass the route's
 * `request.signal`), and a try again only where that is safe (a read, or a write carrying the browser's own idempotency key;
 * 429 for every request), waiting what the backend's Retry-After says. A failure comes back as a response: 504
 * `upstream_timeout` when the backend did not answer in time, 503 `upstream_unavailable` otherwise, both with a Retry-After.
 */
export async function callPatientApi(path: string, init: PatientApiInit = {}, accessToken?: string | null) {
  const { timeoutMs, signal: callerSignal, ...options } = init;
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  // fetch() labels a string body text/plain, which the API's JSON parser ignores (the handler then sees {}).
  if (typeof options.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");

  const plan = planRetries(options.method, headers.has("idempotency-key"));
  const limit = timeoutFor(path, options.body, timeoutMs);
  const unavailable = (status: number, statusText: string) => new Response(null, { status, statusText, headers: { "retry-after": "2" } });

  for (let attempt = 0; ; attempt++) {
    if (callerSignal?.aborted) return unavailable(503, "request_aborted");
    const timeout = AbortSignal.timeout(limit);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(patientApiUrl(path), { ...options, headers, signal, cache: "no-store" });
    } catch {
      if (callerSignal?.aborted) return unavailable(503, "request_aborted");
      if (plan.retryTransport && attempt < MAX_RETRIES) {
        try { await pause(retryDelayMs(attempt), callerSignal); } catch { return unavailable(503, "request_aborted"); }
        continue;
      }
      return timeout.aborted ? unavailable(504, "upstream_timeout") : unavailable(503, "upstream_unavailable");
    }
    const retryAfter = response.headers.get("retry-after");
    if (!response.ok && attempt < MAX_RETRIES && shouldRetryStatus(response.status, plan) && !retryAfterTooLong(retryAfter)) {
      try { await pause(retryDelayMs(attempt, retryAfter), callerSignal); } catch { return unavailable(503, "request_aborted"); }
      continue;
    }
    return response;
  }
}
