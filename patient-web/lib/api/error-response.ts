import { NextResponse } from "next/server";

const publicMessages = new Set([
  "authentication_required",
  "idempotency_key_required",
  "idempotency_request_in_progress",
  "idempotency_key_reused_with_different_request",
  "medicine_required",
  "invalid_cart_item",
  "address_id_required",
  "address_not_found",
  "address_coordinates_required",
  "payment_method_not_supported",
  "pharmacy_cart_empty",
  "checkout_contains_unsupported_items",
  "prescription_media_not_supported",
  "request_conflict",
  "request_invalid",
]);

function messageFrom(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = (value as { message?: unknown }).message;
  return typeof candidate === "string" && publicMessages.has(candidate) ? candidate : undefined;
}

export function boundedUpstreamError(value: unknown, fallback: string, status: number) {
  const message = messageFrom(value) || fallback;
  const safeStatus = status >= 400 && status < 600 ? status : 502;
  return NextResponse.json({ message }, { status: safeStatus, headers: { "cache-control": "no-store" } });
}
