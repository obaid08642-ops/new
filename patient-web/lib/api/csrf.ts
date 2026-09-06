import { NextResponse } from "next/server";

export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return null; // allow same-site / direct API callers

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ message: "cross_origin_request_forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: "invalid_origin" }, { status: 400 });
  }

  return null;
}
