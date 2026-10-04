import { NextResponse } from "next/server";

// 13.R5 — accept UPPER_SNAKE catalog codes and lower_snake aliases
// (e.g. `slot_taken`, `lock_not_found`) from the backend. The code is passed
// through verbatim plus an `error_code` alias so clients can read either key;
// clients resolve message/nextStep from their per-locale catalog.
const CODE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;

function readCode(value: Record<string, unknown>): string | undefined {
  const raw = value.code ?? value.error_code;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!CODE_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function boundedUpstreamError(data: unknown, fallback: string, status: number) {
  const value = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const message = typeof value.message === "string" && value.message.length <= 160 ? value.message : fallback;
  const code = readCode(value);
  if (code) return NextResponse.json({ message, code, error_code: code }, { status });
  return NextResponse.json({ message }, { status });
}
