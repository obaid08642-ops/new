"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
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
        const { Room, RoomEvent } = await import("livekit-client");
        const r = new Room(); roomRef.current = r;
        const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://live.nabd.plus";
        await r.connect(url, token);
        await r.localParticipant.enableCameraAndMicrophone();
        r.on(RoomEvent.Disconnected, () => !cancelled && setState("ended"));
        r.remoteParticipants.forEach((p) => p.trackPublications.forEach((t) => t.track && container.current?.appendChild(t.track.attach())));
        r.on(RoomEvent.TrackSubscribed, (track: any) => container.current?.appendChild(track.attach()));
        if (!cancelled) setState("live");
      } catch { if (!cancelled) setState("ended"); }
    })();
    return () => { cancelled = true; roomRef.current?.disconnect(); };
  }, [token]);
  function toggleMic() { const p = roomRef.current?.localParticipant; if (p) { p.setMicrophoneEnabled(!micOn); setMicOn(!micOn); } }
  function toggleCam() { const p = roomRef.current?.localParticipant; if (p) { p.setCameraEnabled(!camOn); setCamOn(!camOn); } }
  function leave() { roomRef.current?.disconnect(); setState("ended"); }
  return <div>
    {state === "connecting" ? <p role="status"><LoaderCircle className="spinner" size={18} aria-hidden="true" /> {labels.connecting}</p> : null}
    {state === "ended" ? <p role="status">{labels.ended}</p> : null}
    <div ref={container} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", minHeight: 320 }} />
    {state === "live" ? <div style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={toggleMic}>{micOn ? <Mic size={16} /> : <MicOff size={16} />} {labels.mute}</button>
      <button type="button" onClick={toggleCam}>{camOn ? <Video size={16} /> : <VideoOff size={16} />} {labels.camera}</button>
      <button type="button" onClick={leave}><PhoneOff size={16} /> {labels.leave}</button>
    </div> : null}
  </div>;
}
