import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { buildVoiceMessage, MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "@/lib/chat/voice-note";

const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAMES: Record<string, { name: string; mime: string }> = { "audio/wav": { name: "voice.wav", mime: "audio/wav" }, "audio/mp4": { name: "voice.m4a", mime: "audio/mp4" } };

/**
 * Sends a voice note in a doctor's thread, as the app does: the file to POST /media/upload (purpose chat, thread_id), then
 * POST /chat/threads/:id/messages with type voice, media_ids and duration_seconds. The thread's rules (can_voice, window)
 * are enforced by the backend on both calls; this route only forwards. The browser's idempotency key becomes the message's
 * client_message_id so a retry after a dropped connection cannot store two notes.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const threadId = form?.get("thread_id");
  const seconds = Number(form?.get("duration_seconds"));
  const kind = file instanceof Blob ? NAMES[file.type.split(";")[0]] : undefined;
  if (!(file instanceof Blob) || !kind || typeof threadId !== "string" || !THREAD_ID.test(threadId) || file.size < 1 || file.size > MAX_VOICE_BYTES || !Number.isFinite(seconds) || seconds < 0 || seconds > MAX_VOICE_SECONDS + 1) {
    return NextResponse.json({ message: "invalid_voice_note" }, { status: 400 });
  }
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.slice(0, 128) || crypto.randomUUID();

  const upload = new FormData();
  upload.append("file", file, kind.name);
  upload.append("purpose", "chat");
  upload.append("thread_id", threadId);
  const up = await callPatientApi("/media/upload", { method: "POST", body: upload }, accessToken);
  const uploaded = await up.json().catch(() => null);
  if (!up.ok) return boundedUpstreamError(uploaded, "upload_failed", up.status);
  const mediaId = uploaded && typeof uploaded === "object" && typeof (uploaded as { id?: unknown }).id === "string" ? (uploaded as { id: string }).id : "";
  if (!mediaId) return NextResponse.json({ message: "upload_failed" }, { status: 502 });

  const message = buildVoiceMessage({ mediaId, name: kind.name, mime: kind.mime, size: file.size, seconds, clientMessageId: key });
  const sent = await callPatientApi(`/chat/threads/${encodeURIComponent(threadId)}/messages`, { method: "POST", headers: { "idempotency-key": key }, body: JSON.stringify(message) }, accessToken);
  const data = await sent.json().catch(() => null);
  if (!sent.ok) return boundedUpstreamError(data, "send_failed", sent.status);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
