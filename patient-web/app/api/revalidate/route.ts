import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * 14.8: the backend PurgeBus calls this after a catalogue change (POST, `Authorization: Bearer
 * <NEXT_REVALIDATE_SECRET>`, body `{ tags: string[] }`) so tagged fetches (product pages carry
 * `medicines`) are refetched on the next request instead of waiting for their `revalidate` window.
 * No secret configured = the endpoint is off (503), never open.
 */
const TAG = /^[a-z0-9:_-]{1,80}$/;
const NO_STORE = { "cache-control": "no-store" };

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header?.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = process.env.NEXT_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "revalidate_disabled" }, { status: 503, headers: NO_STORE });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags : [];
  if (tags.length === 0 || tags.length > 50 || !tags.every((t) => typeof t === "string" && TAG.test(t))) {
    return NextResponse.json({ error: "invalid_tags" }, { status: 400, headers: NO_STORE });
  }
  // expire: 0 drops the cached copy now; the next visit fetches the new price.
  for (const tag of new Set(tags as string[])) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: [...new Set(tags)] }, { headers: NO_STORE });
}
