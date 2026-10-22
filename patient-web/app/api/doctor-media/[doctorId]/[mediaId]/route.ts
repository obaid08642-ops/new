import { NextResponse } from "next/server";
import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";

type Context = { params: Promise<{ doctorId: string; mediaId: string }> };
const ID = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * 2-web#3: a public doctor's photo or clinic photo, from GET /care/doctors/:id/media/:mediaId (the server serves only that
 * doctor's own images while the doctor is public). Image bytes are passed on; a stored file's short link is followed here
 * and its bytes passed on. Anything else is a 404.
 */
export async function GET(_request: Request, context: Context) {
  const { doctorId, mediaId } = await context.params;
  if (!ID.test(doctorId) || !ID.test(mediaId)) return NextResponse.json({ message: "media_not_found" }, { status: 404 });
  let upstream: Response;
  try {
    upstream = await fetch(patientApiUrl(`/care/doctors/${encodeURIComponent(doctorId)}/media/${encodeURIComponent(mediaId)}`), { signal: publicReadSignal(), redirect: "manual", cache: "no-store" });
  } catch {
    return NextResponse.json({ message: "upstream_unavailable" }, { status: 503 });
  }
  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location && /^https?:\/\//i.test(location)) {
    // a stored file's short link (object storage): fetched here and passed on, so the page needs no other image host
    try {
      upstream = await fetch(location, { cache: "no-store" });
    } catch {
      return NextResponse.json({ message: "upstream_unavailable" }, { status: 503 });
    }
  }
  const type = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !type.startsWith("image/")) return NextResponse.json({ message: "media_not_found" }, { status: 404 });
  return new NextResponse(await upstream.arrayBuffer(), {
    status: 200,
    headers: { "content-type": type, "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" },
  });
}
