import { NextResponse, type NextRequest } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";

const VERTICALS = new Set(["lab", "radiology", "nursing"]);
const EVENTS = new Set(["view", "search"]);
const SERVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * The ranking signals a browser can report for the lab, radiology and nursing catalogues (POST /catalogue/ranking/events is @Public on
 * the backend; the signed-in /api/patient proxy would refuse a visitor). Cart adds and orders are counted by the server and refused there.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const vertical = typeof body?.vertical === "string" ? body.vertical : "";
  const event = typeof body?.event === "string" ? body.event : "";
  const serviceId = typeof body?.service_id === "string" ? body.service_id : "";
  const sessionId = typeof body?.session_id === "string" ? body.session_id.slice(0, 64) : "";
  if (!VERTICALS.has(vertical) || !EVENTS.has(event) || !SERVICE_ID.test(serviceId) || !sessionId) return NextResponse.json({ message: "invalid_event" }, { status: 400 });
  const upstream = await callPatientApi("/catalogue/ranking/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vertical, service_id: serviceId, event, session_id: sessionId }),
    signal: request.signal,
  });
  return forwardApiResponse(upstream);
}
