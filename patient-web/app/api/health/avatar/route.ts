import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  data_url: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(8_000_000),
  name: z.string().min(1).max(255),
});

/**
 * The profile photo, as the app does it: the image is uploaded to POST /media/upload (folder "avatars") and its URL is saved
 * with PATCH /users/me/profile {avatar_url}. The browser sends the image as a data URL, as the support upload does.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const match = /^data:([^;]+);base64,(.+)$/.exec(parsed.data.data_url);
  if (!match) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > 5_000_000) return NextResponse.json({ message: "invalid_upload_payload" }, { status: 400 });
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: match[1] }), parsed.data.name);
  form.append("folder", "avatars");
  const upload = await callPatientApi("/media/upload", { method: "POST", body: form }, accessToken);
  const uploaded = (await upload.json().catch(() => null)) as { url?: unknown; scan_status?: unknown; data?: { url?: unknown; scan_status?: unknown } } | null;
  if (!upload.ok) return boundedUpstreamError(uploaded, "upload_failed", upload.status);
  const url = typeof uploaded?.url === "string" ? uploaded.url : typeof uploaded?.data?.url === "string" ? uploaded.data.url : null;
  if (!url) return NextResponse.json({ message: "upload_missing_url" }, { status: 502 });
  const saved = await callPatientApi("/users/me/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ avatar_url: url }) }, accessToken);
  const data = await saved.json().catch(() => null);
  if (!saved.ok) return boundedUpstreamError(data, "profile_update_failed", saved.status);
  const scan = typeof uploaded?.scan_status === "string" ? uploaded.scan_status : typeof uploaded?.data?.scan_status === "string" ? uploaded.data.scan_status : undefined;
  return NextResponse.json(scan ? { url, scan_status: scan } : { url }, { headers: { "cache-control": "no-store" } });
}
