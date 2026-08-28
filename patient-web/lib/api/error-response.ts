import { NextResponse } from "next/server";

export function boundedUpstreamError(data: unknown, fallback: string, status: number) {
  const value = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const message = typeof value.message === "string" && value.message.length <= 160 ? value.message : fallback;
  const code = typeof value.code === "string" && /^[A-Z0-9_.-]{1,80}$/.test(value.code) ? value.code : undefined;
  return NextResponse.json(code ? { message, code } : { message }, { status });
}
