import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({ ids: z.array(z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/)).min(2).max(6) });

/** Drug compare (parity #33): server-side comparison of up to 6 catalog medicines. */
export async function POST(request: Request) {
  // Public read-only data, but still same-origin gated like every BFF route.
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_compare_payload" }, { status: 400 });
  const upstream = await callPatientApi("/medicines/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids: parsed.data.ids }),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "compare_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
