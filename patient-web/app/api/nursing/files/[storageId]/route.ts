import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const STORAGE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A result file the nurse attached to the visit: ask the backend for a short-lived signed URL (it checks that the file is shared with this patient) and send the browser there. */
export async function GET(_request: Request, { params }: { params: Promise<{ storageId: string }> }) {
  const { storageId } = await params;
  if (!STORAGE_ID.test(storageId)) return NextResponse.json({ message: "invalid_file" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/storage/${encodeURIComponent(storageId)}/signed-url`, {}, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "file_unavailable", upstream.status);
  const raw = (data?.data ?? data)?.url;
  let target: URL | null = null;
  try { target = typeof raw === "string" ? new URL(raw) : null; } catch { target = null; }
  if (!target || target.protocol !== "https:") return NextResponse.json({ message: "file_unavailable" }, { status: 502 });
  return NextResponse.redirect(target, { status: 302, headers: { "cache-control": "no-store" } });
}
