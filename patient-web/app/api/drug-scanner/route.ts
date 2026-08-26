import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const barcodeSchema = z.object({ kind: z.literal("barcode"), code: z.string().trim().min(3).max(60) });
const interactionsSchema = z.object({
  kind: z.literal("interactions"),
  drugs: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
});
const bodySchema = z.discriminatedUnion("kind", [barcodeSchema, interactionsSchema]);

/** Drug scanner parity #21: barcode lookup + interaction check against the regimen. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_scanner_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  let upstreamPath: string;
  let payload: Record<string, unknown>;
  if (parsed.data.kind === "barcode") {
    upstreamPath = "/ai/barcode-lookup";
    payload = { code: parsed.data.code };
  } else {
    upstreamPath = "/ai/drug-interactions";
    payload = { drugs: parsed.data.drugs };
  }
  const upstream = await callPatientApi(upstreamPath, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "lookup_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
