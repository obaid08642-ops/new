import { NextResponse, type NextRequest } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";

const EVENTS = new Set(["product_viewed", "product_searched", "product_clicked"]);

/**
 * The ranking signals a browser can report (POST /medicines/events is @Public on the backend): a medicine page viewed, a
 * suggestion opened. Cart adds, wishlist adds and purchases are recorded by the server itself and refused there. The
 * session id keeps one visitor's repeat views from counting more than once without merging every visitor behind this
 * server's address into one.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { event_type?: unknown; drug_id?: unknown; session_id?: unknown } | null;
  const eventType = typeof body?.event_type === "string" ? body.event_type : "";
  const drugId = typeof body?.drug_id === "string" ? body.drug_id.slice(0, 80) : "";
  const sessionId = typeof body?.session_id === "string" ? body.session_id.slice(0, 80) : "";
  if (!EVENTS.has(eventType) || !drugId || !sessionId) return NextResponse.json({ message: "invalid_event" }, { status: 400 });
  const upstream = await callPatientApi("/medicines/events", {
    method: "POST",
    body: JSON.stringify({ event_type: eventType, drug_id: drugId, session_id: sessionId }),
    signal: request.signal,
  });
  return forwardApiResponse(upstream);
}
