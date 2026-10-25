"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatClock } from "@/lib/chat/voice-note";
import styles from "./consult.module.css";

/** A received or sent voice message: play/pause, length and a seekable progress bar. The link is asked for on the first play. */
export function VoiceNotePlayer({ mediaId, durationSeconds }: { mediaId: string; durationSeconds?: number }) {
  const t = useTranslations("ChatDetail");
  const audio = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(durationSeconds ?? 0);

  useEffect(() => { if (src && audio.current) void audio.current.play().catch(() => setFailed(true)); }, [src]);

  async function toggle() {
    const el = audio.current;
    if (playing && el) { el.pause(); return; }
    if (src && el) { void el.play().catch(() => setFailed(true)); return; }
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/chat/voice/${encodeURIComponent(mediaId)}`, { credentials: "same-origin" });
      const body = response.ok ? ((await response.json().catch(() => null)) as { url?: string } | null) : null;
      if (!body?.url) throw new Error("media_unavailable");
      setSrc(body.url);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const total = Math.max(length, durationSeconds ?? 0, 1);
  return (
    <div className={styles.voicePlayer} data-testid="voice-player">
      <Button label={playing ? t("voice.pause") : t("voice.play")} variant="outline" size="md" loading={loading} disabled={loading} onClick={() => void toggle()} />
      <input
        className={styles.voiceRange}
        type="range"
        min={0}
        max={total}
        step={0.1}
        value={Math.min(time, total)}
        disabled={!src}
        aria-label={t("voice.playerLabel", { time: formatClock(durationSeconds ?? length) })}
        aria-valuetext={`${formatClock(time)} / ${formatClock(total)}`}
        onChange={(event) => { const v = Number(event.target.value); if (audio.current) audio.current.currentTime = v; setTime(v); }}
      />
      <span className={styles.voiceTime} dir="ltr">{formatClock(playing || time > 0 ? time : total)}</span>
      {src ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- a voice message; no transcript exists
        <audio
          ref={audio}
          src={src}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setTime(0); }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => { if (Number.isFinite(event.currentTarget.duration)) setLength(event.currentTarget.duration); }}
          onError={() => { setPlaying(false); setFailed(true); setSrc(null); }}
        />
      ) : null}
      {failed ? <p role="alert" className={styles.rowSub}>{t("voice.errors.loadFailed")}</p> : null}
    </div>
  );
}
