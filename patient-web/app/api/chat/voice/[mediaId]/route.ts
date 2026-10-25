import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { safeMediaUrl } from "@/lib/chat/voice-note";

/** The short-lived link for a voice note (GET /media/:id/url; the backend lets only the thread's participants read it). */
export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(mediaId)) return NextResponse.json({ message: "invalid_media_id" }, { status: 400 });
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/media/${encodeURIComponent(mediaId)}/url`, { signal: request.signal }, accessToken);
  const data = await upstream.json().catch(() => null);
  const url = safeMediaUrl(data && typeof data === "object" ? (data as { url?: unknown }).url : null);
  if (!upstream.ok || !url) return NextResponse.json({ message: "media_unavailable" }, { status: upstream.ok ? 502 : upstream.status });
  return NextResponse.json({ url }, { headers: { "cache-control": "no-store" } });
}
