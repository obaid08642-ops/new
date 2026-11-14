"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { encodeWav, formatClock, MAX_VOICE_SECONDS, pickRecorderMime, uploadNameFor, voiceReducer, WAV_SAMPLE_RATE } from "@/lib/chat/voice-note";
import styles from "./consult.module.css";

/** MediaRecorder output (WebM/Ogg) to 16 kHz mono samples; the media store reads WAV, MP3 and MP4 audio only. */
async function toWav(blob: Blob): Promise<Blob> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * WAV_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, WAV_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return new Blob([encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE)], { type: "audio/wav" });
  } finally {
    void ctx.close();
  }
}

/**
 * The voice-note recorder of an online consultation's thread (items 388 / 799). The page draws it only when the server's
 * rules say `can_voice`. Record, see the timer, cancel or stop, listen to the preview, then send or discard; a failed
 * upload keeps the recording for "Try again" (same idempotency key). Nothing is stored on the device.
 */
export function VoiceNoteRecorder({ threadId }: { threadId: string }) {
  const t = useTranslations("ChatDetail");
  const router = useRouter();
  const [state, dispatch] = useReducer(voiceReducer, { phase: "idle" });
  const [supported, setSupported] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const key = useRef<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && pickRecorderMime((m) => MediaRecorder.isTypeSupported(m)) !== null);
  }, []);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => () => { cancelled.current = true; release(); if (recorder.current?.state === "recording") recorder.current.stop(); }, [release]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const stop = useCallback(() => { if (recorder.current?.state === "recording") recorder.current.stop(); }, []);

  async function start() {
    dispatch({ type: "start" });
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      dispatch({ type: "fail", kind: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "recordFailed" });
      return;
    }
    try {
      const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      stream.current = media;
      recorder.current = rec;
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      rec.onerror = () => { release(); dispatch({ type: "fail", kind: "recordFailed" }); };
      rec.onstop = () => {
        release();
        if (cancelled.current) return;
        const recorded = new Blob(chunks.current, { type: rec.mimeType || mime || "audio/webm" });
        if (recorded.size === 0) { dispatch({ type: "fail", kind: "recordFailed" }); return; }
        blob.current = recorded;
        setPreviewUrl(URL.createObjectURL(recorded));
        dispatch({ type: "stop" });
      };
      rec.start();
      startedAt.current = Date.now();
      dispatch({ type: "granted" });
      timer.current = setInterval(() => {
        const seconds = (Date.now() - startedAt.current) / 1000;
        dispatch({ type: "tick", seconds });
        if (seconds >= MAX_VOICE_SECONDS) stop();
      }, 250);
    } catch {
      media.getTracks().forEach((track) => track.stop());
      dispatch({ type: "fail", kind: "recordFailed" });
    }
  }

  function cancel() {
    cancelled.current = true;
    stop();
    release();
    blob.current = null;
    key.current = null;
    setPreviewUrl(null);
    dispatch({ type: "cancel" });
  }

  async function send() {
    const recorded = blob.current;
    if (!recorded || (state.phase !== "preview" && state.phase !== "error")) return;
    const seconds = state.phase === "preview" || state.phase === "error" ? state.seconds ?? 1 : 1;
    dispatch({ type: "send" });
    key.current ??= crypto.randomUUID();
    try {
      const file = recorded.type.startsWith("audio/mp4") ? recorded : await toWav(recorded);
      const form = new FormData();
      form.append("file", file, uploadNameFor(file.type, Date.now()).name);
      form.append("thread_id", threadId);
      form.append("duration_seconds", String(seconds));
      const response = await fetch("/api/chat/voice", { method: "POST", body: form, headers: { "idempotency-key": key.current }, credentials: "same-origin" });
      if (!response.ok) {
        dispatch({ type: "fail", kind: response.status === 403 ? "forbidden" : "uploadFailed" });
        if (response.status === 403) router.refresh();
        return;
      }
      blob.current = null;
      key.current = null;
      setPreviewUrl(null);
      dispatch({ type: "sent" });
      router.refresh();
    } catch {
      dispatch({ type: "fail", kind: "uploadFailed" });
    }
  }

  if (!supported) return <p className={styles.rowSub} role="note" data-testid="voice-unsupported">{t("voice.unsupported")}</p>;

  const clock = (s: number) => formatClock(s);
  return (
    <section className={styles.voiceBox} aria-label={t("voice.title")} data-testid="voice-recorder">
      {state.phase === "idle" || state.phase === "requesting" || (state.phase === "error" && state.seconds === undefined) ? (
        <Button label={t("voice.record")} variant="outline" size="lg" fullWidth loading={state.phase === "requesting"} disabled={state.phase === "requesting"} onClick={() => void start()} />
      ) : null}
      {state.phase === "recording" ? (
        <>
          <p className={styles.voiceClock} role="timer" aria-label={t("voice.recording", { time: clock(state.seconds) })}>{clock(state.seconds)} / {clock(MAX_VOICE_SECONDS)}</p>
          <div className={styles.voiceActions}>
            <Button label={t("voice.cancel")} variant="secondary" size="lg" onClick={cancel} />
            <Button label={t("voice.stop")} variant="danger" size="lg" onClick={stop} />
          </div>
          {state.seconds >= MAX_VOICE_SECONDS ? <p className={styles.rowSub} role="status">{t("voice.maxReached", { minutes: MAX_VOICE_SECONDS / 60 })}</p> : null}
        </>
      ) : null}
      {(state.phase === "preview" || state.phase === "sending" || (state.phase === "error" && state.seconds !== undefined)) && previewUrl ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a recording of the patient's own voice; no transcript exists */}
          <audio className={styles.voiceAudio} controls preload="metadata" src={previewUrl} aria-label={t("voice.previewLabel", { time: clock(state.seconds ?? 0) })} />
          <div className={styles.voiceActions}>
            <Button label={t("voice.discard")} variant="secondary" size="lg" onClick={cancel} disabled={state.phase === "sending"} />
            <Button label={state.phase === "sending" ? t("voice.sending") : state.phase === "error" ? t("voice.retry") : t("voice.send")} size="lg" loading={state.phase === "sending"} disabled={state.phase === "sending"} onClick={() => void send()} />
          </div>
        </>
      ) : null}
      {state.phase === "error" ? <p role="alert" className={styles.rowSub}>{t(`voice.errors.${state.kind}`)}</p> : null}
    </section>
  );
}
