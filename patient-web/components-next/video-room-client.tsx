"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import styles from "@/components-next/consult/consult.module.css";
type Labels = { connecting: string; ended: string; leave: string; mute: string; camera: string };
export function VideoRoomClient({ token, room, labels }: { token: string; room: string; labels: Labels }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"connecting" | "live" | "ended">("connecting");
  const [micOn, setMicOn] = useState(true); const [camOn, setCamOn] = useState(true);
  const roomRef = useRef<any>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const livekitModule: any = await (Function('return import("livekit-client")')() as Promise<any>);
        const Room = livekitModule.Room;
        const RoomEvent = livekitModule.RoomEvent;
        const r = new Room(); roomRef.current = r;
        const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://live.nabd.plus";
        await r.connect(url, token);
        await r.localParticipant.enableCameraAndMicrophone();
        r.on(RoomEvent.Disconnected, () => !cancelled && setState("ended"));
        (r.remoteParticipants as Map<string, any>).forEach((p: any) => (p.trackPublications as Map<string, any>).forEach((t: any) => t.track && container.current?.appendChild(t.track.attach())));
        r.on(RoomEvent.TrackSubscribed, (track: any) => container.current?.appendChild(track.attach()));
        if (!cancelled) setState("live");
      } catch { if (!cancelled) setState("ended"); }
    })();
    return () => { cancelled = true; roomRef.current?.disconnect(); };
  }, [token]);
  function toggleMic() { const p = roomRef.current?.localParticipant; if (p) { p.setMicrophoneEnabled(!micOn); setMicOn(!micOn); } }
  function toggleCam() { const p = roomRef.current?.localParticipant; if (p) { p.setCameraEnabled(!camOn); setCamOn(!camOn); } }
  function leave() { roomRef.current?.disconnect(); setState("ended"); }
  return (
    <div className={styles.stack}>
      {state === "connecting" ? <p role="status" className={styles.callState}><Spinner size={18} />{labels.connecting}</p> : null}
      {state === "ended" ? <p role="status" className={styles.callState}>{labels.ended}</p> : null}
      <div ref={container} className={styles.stage} />
      {state === "live" ? (
        <div className={styles.actionsRow}>
          <Button variant={micOn ? "outline" : "secondary"} label={labels.mute} onClick={toggleMic} />
          <Button variant={camOn ? "outline" : "secondary"} label={labels.camera} onClick={toggleCam} />
          <Button variant="danger" label={labels.leave} onClick={leave} />
        </div>
      ) : null}
    </div>
  );
}
