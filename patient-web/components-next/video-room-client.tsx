"use client";
import { useEffect, useRef, useState } from "react";
import type { LocalTrackPublication, Room, Track as TrackType } from "livekit-client";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { CallMediaToggles, type CallMediaPending } from "@/components-next/consult/call-media-toggles";
import styles from "@/components-next/consult/consult.module.css";

type Labels = { connecting: string; live: string; waiting: string; ended: string; leave: string; microphone: string; camera: string; you: string; doctor: string };

/**
 * The call itself (video-call and room/[id]): connects to LiveKit with the server-issued token, shows the patient's own
 * camera and the other side's tracks, and the camera/microphone toggles of decision 4. `serverUrl` comes from the page
 * (lib/consult/livekit-url.ts, read on the server), so the same build talks to any LiveKit.
 */
export function VideoRoomClient({ token, serverUrl, labels }: { token: string; serverUrl: string; labels: Labels }) {
  const localTile = useRef<HTMLDivElement>(null);
  const remoteTile = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<"connecting" | "live" | "ended">("connecting");
  const [remoteCount, setRemoteCount] = useState(0);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [pending, setPending] = useState<CallMediaPending>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Bundled and loaded on demand: the call screens are the only pages that need the LiveKit client.
        const { Room, RoomEvent, Track } = await import("livekit-client");
        if (cancelled) return;
        const room = new Room();
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
          .on(RoomEvent.Disconnected, () => { if (!cancelled) setState("ended"); });
        await room.connect(serverUrl, token);
        if (cancelled) { void room.disconnect(); return; }
        room.remoteParticipants.forEach((participant) => participant.trackPublications.forEach((publication) => { if (publication.track) attachRemote(publication.track); }));
        countRemote();
        setState("live");
        // Connected even when the browser refuses the camera or microphone: the toggles then show them off.
        await room.localParticipant.enableCameraAndMicrophone().catch(() => undefined);
        readMedia();
      } catch {
        if (!cancelled) setState("ended");
      }
    })();
    return () => { cancelled = true; void roomRef.current?.disconnect(); roomRef.current = null; };
  }, [token, serverUrl]);

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
  function leave() { void roomRef.current?.disconnect(); setState("ended"); }

  return (
    <div className={styles.stack} data-call-state={state}>
      {state === "connecting" ? <p role="status" className={styles.callState}><Spinner size={18} />{labels.connecting}</p> : null}
      {state === "live" ? <p role="status" className={styles.callState}>{remoteCount > 0 ? labels.live : labels.waiting}</p> : null}
      {state === "ended" ? <p role="status" className={styles.callState}>{labels.ended}</p> : null}
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
      {state === "live" ? (
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
