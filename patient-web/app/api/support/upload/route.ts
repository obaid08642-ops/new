import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  data_url: z.string().startsWith("data:").max(15_000_000),
  name: z.string().min(1).max(255),
});

/** Parity with app support attach: JSON data_url forwarded as multipart to /media/upload. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const match = /^data:([^;]+);base64,(.+)$/.exec(parsed.data.data_url);
  if (!match) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  }
  if (bytes.length === 0 || bytes.length > 12_000_000) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: match[1] }), parsed.data.name);
  form.append("folder", "support");
  const upstream = await callPatientApi("/media/upload", { method: "POST", body: form }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "upload_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
