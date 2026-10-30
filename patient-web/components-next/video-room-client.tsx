"use client";
import type { IceServer } from "@/lib/calls/ice-servers";
import { useEffect, useRef, useState } from "react";
import type { LocalTrackPublication, Room, Track as TrackType } from "livekit-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { CallMediaToggles, type CallMediaPending } from "@/components-next/consult/call-media-toggles";
import styles from "@/components-next/consult/consult.module.css";
import { callRoomOptions, poorConnectionTracker, qualityLevel, reconnectClock, setVideo, stateAfterDisconnect, type QualityLevel } from "@/lib/consult/call-resilience";

type Labels = {
  connecting: string; live: string; waiting: string; ended: string; leave: string; microphone: string; camera: string; you: string; doctor: string;
  reconnecting: string; audioOnly: string; tryVideo: string; dropped: string; continueInChat: string;
  qualityYou: string; qualityOther: string; quality: Record<QualityLevel, string>;
};


/**
 * The call itself (video-call and room/[id]): connects to LiveKit with the server-issued token, shows the patient's own
 * camera and the other side's tracks, and the camera/microphone toggles of decision 4. `serverUrl` comes from the page
 * (lib/consult/livekit-url.ts, read on the server), so the same build talks to any LiveKit.
 * P14.22: the apps' connection settings (adaptive stream, dynacast, simulcast at 180p/360p, speech audio with DTX); a
 * network switch (Wi-Fi to 4G) shows "reconnecting" while LiveKit resumes the same call; a poor connection drops to audio
 * only (no camera sent, no video received) with a way back to video; a dropped call offers the appointment's chat.
 */
export function VideoRoomClient({ token, serverUrl, labels, chatHref, ratingHref, startAudioOnly = false, iceServers = [] }: { token: string; serverUrl: string; /** TURN/STUN from the server (short-lived credentials): a relay for networks that allow only HTTPS out. */ iceServers?: IceServer[]; labels: Labels; /** The server's advice (call pressure): start with sound only. */ startAudioOnly?: boolean; chatHref?: string; /** Where hanging up goes: the rating of the consultation (as the app). */ ratingHref?: string }) {
  const router = useRouter();
  const localTile = useRef<HTMLDivElement>(null);
  const remoteTile = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<"connecting" | "live" | "reconnecting" | "ended" | "dropped">("connecting");
  const [audioOnly, setAudioOnly] = useState(false);
  const poorReports = useRef(poorConnectionTracker());
  const audioOnlyRef = useRef(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [pending, setPending] = useState<CallMediaPending>(null);
  const [quality, setQuality] = useState<{ local: QualityLevel; remote: QualityLevel }>({ local: "unknown", remote: "unknown" });
  const clockRef = useRef<ReturnType<typeof reconnectClock> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Bundled and loaded on demand: the call screens are the only pages that need the LiveKit client.
        const { Room, RoomEvent, Track, VideoPresets, AudioPresets, ConnectionQuality, DisconnectReason } = await import("livekit-client");
        if (cancelled) return;
        const room = new Room(callRoomOptions({ VideoPresets, AudioPresets }));
        roomRef.current = room;
        const attachRemote = (track: TrackType) => { if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) remoteTile.current?.appendChild(track.attach()); };
        const showLocal = (publication: LocalTrackPublication) => {
          if (publication.source !== Track.Source.Camera || !publication.track || !localTile.current) return;
          const element = publication.track.attach();
          element.muted = true;
          localTile.current.replaceChildren(element);
        };
        const countRemote = () => { if (!cancelled) setRemoteCount(room.remoteParticipants.size); };
        const readMedia = () => { if (!cancelled) { setMicrophoneOn(room.localParticipant.isMicrophoneEnabled); setCameraOn(room.localParticipant.isCameraEnabled); } };
        room
          .on(RoomEvent.TrackSubscribed, attachRemote)
          .on(RoomEvent.TrackUnsubscribed, (track: TrackType) => track.detach().forEach((element) => element.remove()))
          .on(RoomEvent.ParticipantConnected, countRemote)
          .on(RoomEvent.ParticipantDisconnected, countRemote)
          .on(RoomEvent.LocalTrackPublished, showLocal)
          .on(RoomEvent.TrackMuted, readMedia)
          .on(RoomEvent.TrackUnmuted, readMedia)
          .on(RoomEvent.Reconnecting, () => startReconnectClock(room))
          .on(RoomEvent.SignalReconnecting, () => startReconnectClock(room))
          .on(RoomEvent.Reconnected, () => { stopReconnectClock(); if (!cancelled) setState("live"); })
          .on(RoomEvent.ConnectionQualityChanged, (quality: string, participant: { identity: string }) => {
            if (cancelled) return;
            const local = participant.identity === room.localParticipant.identity;
            setQuality((q) => (local ? { ...q, local: qualityLevel(quality) } : { ...q, remote: qualityLevel(quality) }));
            if (!local) return;
            if (poorReports.current.report(quality, ConnectionQuality.Poor)) void goAudioOnly(room);
          })
          .on(RoomEvent.Disconnected, (reason?: number) => {
            stopReconnectClock();
            if (cancelled) return;
            setState((current) => (current === "dropped" ? current : stateAfterDisconnect(reason, DisconnectReason.CLIENT_INITIATED)));
          });
        // Losing the connection (Wi-Fi <-> 4G/5G, a lift) shows "reconnecting" while LiveKit restarts ICE and resumes the same call;
        // only after RECONNECT_DEADLINE_MS without it is the call over ("dropped", with the chat as the way on).
        const clock = reconnectClock(() => { if (cancelled) return; setState("dropped"); void room.disconnect(); });
        clockRef.current = clock;
        function startReconnectClock(_r: Room) { if (cancelled) return; setState("reconnecting"); clock.start(); }
        function stopReconnectClock() { clock.stop(); }
        await room.connect(serverUrl, token, iceServers.length ? { rtcConfig: { iceServers } } : undefined);
        if (cancelled) { void room.disconnect(); return; }
        room.remoteParticipants.forEach((participant) => participant.trackPublications.forEach((publication) => { if (publication.track) attachRemote(publication.track); }));
        countRemote();
        setState("live");
        // Connected even when the browser refuses the camera or microphone: the toggles then show them off.
        if (startAudioOnly) {
          // the server advises sound only (call pressure): the microphone only, the camera stays off until the patient asks for video
          await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
          await goAudioOnly(room);
        } else {
          await room.localParticipant.enableCameraAndMicrophone().catch(() => undefined);
        }
        readMedia();
      } catch {
        if (!cancelled) setState("ended");
      }
    })();
    return () => {
      cancelled = true;
      clockRef.current?.stop();
      clockRef.current = null;
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [token, serverUrl, startAudioOnly]);

  /** Video off both ways, sound kept: the camera stops publishing and the other side's video is unsubscribed. */
  async function goAudioOnly(room: Room) {
    if (audioOnlyRef.current) return;
    audioOnlyRef.current = true;
    setAudioOnly(true);
    await setVideo(room, false);
    setCameraOn(room.localParticipant.isCameraEnabled);
  }

  async function tryVideoAgain() {
    const room = roomRef.current;
    if (!room) return;
    poorReports.current.reset();
    audioOnlyRef.current = false;
    setAudioOnly(false);
    await setVideo(room, true);
    setCameraOn(room.localParticipant.isCameraEnabled);
  }

  async function toggle(kind: "microphone" | "camera") {
    const participant = roomRef.current?.localParticipant;
    if (!participant || pending) return;
    setPending(kind);
    try {
      if (kind === "microphone") await participant.setMicrophoneEnabled(!participant.isMicrophoneEnabled);
      else await participant.setCameraEnabled(!participant.isCameraEnabled);
    } catch {
      // the state shown is read back from LiveKit below, so a refused change leaves the toggle where it was
    } finally {
      setMicrophoneOn(participant.isMicrophoneEnabled);
      setCameraOn(participant.isCameraEnabled);
      setPending(null);
    }
  }
  function leave() { void roomRef.current?.disconnect(); setState("ended"); if (ratingHref) router.push(ratingHref); }

  return (
    <div className={styles.stack} data-call-state={state}>
      {state === "connecting" ? <p role="status" className={styles.callState}><Spinner size={18} />{labels.connecting}</p> : null}
      {state === "live" ? <p role="status" className={styles.callState}>{remoteCount > 0 ? labels.live : labels.waiting}</p> : null}
      {state === "reconnecting" ? <p role="status" className={styles.callState}><Spinner size={18} />{labels.reconnecting}</p> : null}
      {state === "ended" ? <p role="status" className={styles.callState}>{labels.ended}</p> : null}
      {state === "dropped" ? (
        <p role="status" className={styles.callState}>
          {labels.dropped}
          {chatHref ? <> <Link href={chatHref} data-call-fallback="chat">{labels.continueInChat}</Link></> : null}
        </p>
      ) : null}
      {audioOnly && state === "live" ? (
        <p role="status" className={styles.callState} data-call-mode="audio-only">
          {labels.audioOnly}
          <Button label={labels.tryVideo} variant="secondary" size="sm" onClick={() => void tryVideoAgain()} />
        </p>
      ) : null}
      {state === "live" || state === "reconnecting" ? (
        <p className={styles.callState} data-call-quality>
          <span role="img" data-quality="local" aria-label={`${labels.qualityYou}: ${labels.quality[quality.local]}`}>{bars(quality.local)}</span>{" "}
          <span role="img" data-quality="remote" aria-label={`${labels.qualityOther}: ${labels.quality[quality.remote]}`}>{bars(quality.remote)}</span>
        </p>
      ) : null}
      <div className={styles.stage}>
        <figure className={styles.tile}>
          <div ref={remoteTile} className={styles.tileMedia} data-tile="remote" data-participants={remoteCount} />
          <figcaption className={styles.tileLabel}>{labels.doctor}</figcaption>
        </figure>
        <figure className={styles.tile}>
          <div ref={localTile} className={styles.tileMedia} data-tile="local" />
          <figcaption className={styles.tileLabel}>{labels.you}</figcaption>
        </figure>
      </div>
      {state === "live" || state === "reconnecting" ? (
        <CallMediaToggles
          microphoneOn={microphoneOn}
          cameraOn={cameraOn}
          pending={pending}
          onToggleMicrophone={() => void toggle("microphone")}
          onToggleCamera={() => void toggle("camera")}
          onLeave={leave}
          labels={{ microphone: labels.microphone, camera: labels.camera, leave: labels.leave }}
        />
      ) : null}
    </div>
  );
}

/** Three bars as text for one side's connection quality (excellent 3, good 2, poor 1, lost/unknown 0). */
function bars(level: QualityLevel): string {
  const n = level === "excellent" ? 3 : level === "good" ? 2 : level === "poor" ? 1 : 0;
  return "▮".repeat(n) + "▯".repeat(3 - n);
}
