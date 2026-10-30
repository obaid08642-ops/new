/**
 * "Notify me when available" on a catalogue service no provider offers yet: the client side of backend/src/modules/catalogue-interest
 * (catalogue-interest.controller.ts: POST /catalogue-interest, GET /catalogue-interest/mine, signed-in patients only).
 * The body is exactly the backend's InterestDto: service_type in lab | radiology | nursing and service_id (1..128 characters).
 */
export const INTEREST_TYPES = ["lab", "radiology", "nursing"] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

/** What the page does next: "done" (registered), "guest" (no session: the API answered 401), "failed" (try again), "invalid" (the DTO would refuse it, nothing sent). */
export type InterestResult = "done" | "guest" | "failed" | "invalid";

export type InterestBody = { service_type: InterestType; service_id: string };

/** The same checks as the DTO (IsIn + IsString + MinLength 1 + MaxLength 128), so a bad value never leaves the browser. */
export function interestBody(type: string, serviceId: string): InterestBody | null {
  const id = serviceId.trim();
  if (!(INTEREST_TYPES as readonly string[]).includes(type) || id.length < 1 || id.length > 128) return null;
  return { service_type: type as InterestType, service_id: id };
}

/** Whether GET /catalogue-interest/mine already lists this service (the state survives a reload because the server holds it). */
export function alreadyAsked(rows: unknown, type: InterestType, serviceId: string): boolean {
  return Array.isArray(rows) && rows.some((row) => !!row && typeof row === "object" && (row as { service_type?: unknown }).service_type === type && (row as { service_id?: unknown }).service_id === serviceId);
}

export async function submitInterest(type: string, serviceId: string, doFetch: typeof fetch = fetch): Promise<InterestResult> {
  const body = interestBody(type, serviceId);
  if (!body) return "invalid";
  try {
    const res = await doFetch("/api/patient/catalogue-interest", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `web-interest-${crypto.randomUUID()}` },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    if (res.status === 401) return "guest";
    return res.ok ? "done" : "failed";
  } catch {
    return "failed";
  }
}

/** "guest" when there is no session, "asked" when the patient already registered, else "ready" (also when the list could not be read: the button still works). */
export async function loadInterestState(type: InterestType, serviceId: string, doFetch: typeof fetch = fetch): Promise<"guest" | "asked" | "ready"> {
  try {
    const res = await doFetch("/api/patient/catalogue-interest/mine", { cache: "no-store", credentials: "same-origin" });
    if (res.status === 401) return "guest";
    if (res.ok) return alreadyAsked(await res.json().catch(() => null), type, serviceId) ? "asked" : "ready";
  } catch { /* unknown: the button still works */ }
  return "ready";
}
