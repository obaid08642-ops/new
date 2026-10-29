import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({ data_url: z.string().startsWith("data:").max(8_000_000) });
const IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/**
 * Journeys 74 (decision 12): the photo of the box on a manual pharmacy request. The patient's own private file
 * (POST /storage/upload); the order then carries its id, and only the pharmacies asked about that order may open it.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const match = parsed.success ? IMAGE.exec(parsed.data.data_url) : null;
  if (!match) return NextResponse.json({ message: "invalid_photo" }, { status: 400 });
  if (Buffer.from(match[2], "base64").length > 5_000_000) return NextResponse.json({ message: "photo_too_large" }, { status: 413 });
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/storage/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mime: match[1], data_base64: match[2], original_name: "box-photo" }) }, accessToken);
  const data = await upstream.json().catch(() => null) as { id?: unknown; scan_status?: unknown } | null;
  if (!upstream.ok) return boundedUpstreamError(data, "photo_upload_failed", upstream.status);
  if (typeof data?.id !== "string" || !data.id) return NextResponse.json({ message: "photo_upload_failed" }, { status: 502 });
  return NextResponse.json(typeof data.scan_status === "string" ? { id: data.id, scan_status: data.scan_status } : { id: data.id }, { headers: { "cache-control": "no-store" } });
}
