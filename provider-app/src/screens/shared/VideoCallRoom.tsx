/**
 * VideoCallRoom — REAL LiveKit video consultation room for providers.
 *
 * Contract (verified against backend livekit.controller + patient app):
 *   1. POST /calls/initiate { appointmentId, call_type: 'video' } → { session_id | id }
 *   2. POST /calls/:sessionId/join → { token, room_name }
 *   3. connect Room (adaptiveStream + dynacast + simulcast, same as patient app)
 *   4. POST /calls/:sessionId/end on hang-up
 * No fake "connected" UI: while connecting shows a spinner, on failure an
 * honest error with retry — never a fake video feed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { Room, RoomEvent, VideoPresets, AudioPresets, Track, ConnectionQuality, DisconnectReason } from 'livekit-client';
import { bindCallResilience, callRoomOptions, qualityBars, type AudioOnlyReason, type QualityLevel } from '../../calls/callResilience';
// @livekit/react-native is a NATIVE module — absent in Expo Go. Guarded require so
// the bundle loads fine there; video UI is hidden and an honest error is shown.
let VideoView: any = null;
let AudioSession: any = { startAudioSession: async () => {}, stopAudioSession: () => {} };
let registerGlobals: any = () => {};
let LIVEKIT_NATIVE_OK = false;
try {
  const lk = require('@livekit/react-native');
  VideoView = lk.VideoView;
  AudioSession = lk.AudioSession;
  registerGlobals = lk.registerGlobals;
  LIVEKIT_NATIVE_OK = !!VideoView;
} catch {
  LIVEKIT_NATIVE_OK = false;
}
import client from '../../api/client';
import { enableLocalMedia, isPermissionError, mediaProblemText, MediaProblem } from './callMedia';
import { useTheme, useLang } from '../../context';
import { NBtn } from '../../components/ui';
import { I } from '../../components/icons';
import { C, SP, FS, FW, R } from '../../constants';
import { tokens, withAlpha } from '../../theme/tokens';

let globalsRegistered = false;
function ensureGlobals() {
  if (!globalsRegistered) {
    try { registerGlobals(); } catch { /* already registered */ }
    globalsRegistered = true;
  }
}

interface VideoCallRoomProps {
  /** Appointment id used to initiate/join the call session. */
  appointmentId: string;
  /** Display name of the remote side (patient). */
  peerName?: string;
  /** Voice-only consultation (no camera published). */
  voiceOnly?: boolean;
  /** Called after the room disconnects and the backend session is ended. */
  onEnd: () => void;
}

export function VideoCallRoom({ appointmentId, peerName, voiceOnly, onEnd }: VideoCallRoomProps) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [phase, setPhase] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errMsg, setErrMsg] = useState('');
  const [remoteTrack, setRemoteTrack] = useState<Track | null>(null);
  const [localTrack, setLocalTrack] = useState<Track | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!voiceOnly);
  const [ending, setEnding] = useState(false);
  // Why the call has no camera or no microphone (shown as a banner, or as the error when the microphone is missing).
  const [problem, setProblem] = useState<MediaProblem | null>(null);
  // a lost connection is resumed by LiveKit (ICE restart) on the same call; only ~30 s without it re-joins
  const [reconnecting, setReconnecting] = useState(false);
  const [audioOnly, setAudioOnly] = useState<AudioOnlyReason | null>(null);
  const [quality, setQuality] = useState<{ local: QualityLevel; remote: QualityLevel }>({ local: 'unknown', remote: 'unknown' });
  const resilienceRef = useRef<ReturnType<typeof bindCallResilience> | null>(null);

  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<string | null>(null);
  const attemptRef = useRef(0);
  const endedRef = useRef(false);
  const reconnectRef = useRef(0);
  const metricsTimer = useRef<any>(null);
  // What the user chose, read at (re)connect time so a drop does not turn the mic and camera back on.
  const wantRef = useRef({ mic: true, camera: !voiceOnly });

  const stopMetrics = () => {
    if (metricsTimer.current) { clearInterval(metricsTimer.current); metricsTimer.current = null; }
  };

  const startMetrics = () => {
    stopMetrics();
    metricsTimer.current = setInterval(async () => {
      try {
        const room = roomRef.current;
        const sid = sessionRef.current;
        if (!room || !sid) return;
        // livekit-client v2 Room has no getStats(): feature-detect and degrade
        // to empty samples instead of breaking call metrics (pre-existing tsc).
        const stats: Map<string, any> = typeof (room as any).getStats === 'function'
          ? await (room as any).getStats()
          : new Map();
        const samples: Array<{ packet_loss: number; jitter: number; rtt: number; bitrate: number }> = [];
        stats.forEach((s: any) => {
          const r = s.remoteInboundRtp || s.inboundRtp || {};
          samples.push({
            packet_loss: Number(r.packetsLost || 0),
            jitter: Number((r.jitter || 0) * 1000),
            rtt: Number(s.rtt || 0),
            bitrate: Number(s.bitrate || 0),
          });
        });
        if (samples.length) await client.post(`/calls/${encodeURIComponent(sid)}/metrics`, { metrics: samples.slice(0, 8) });
      } catch { /* quality telemetry is best-effort */ }
    }, 15000);
  };

  const connect = async () => {
    if (!LIVEKIT_NATIVE_OK) {
      setPhase('error');
      setErrMsg(AR
        ? 'مكالمات الفيديو تتطلب نسخة تطوير (development build) — غير مدعومة داخل Expo Go.'
        : 'Video calls require a development build — not supported inside Expo Go.');
      return;
    }
    ensureGlobals();
    setPhase('connecting');
    setErrMsg('');
    setProblem(null);
    const attempt = ++attemptRef.current;
    let room: Room | null = null;
    try {
      // One call session per screen: a retry or an auto-reconnect joins the same session, it never opens a second room.
      let sessionId = sessionRef.current;
      if (!sessionId) {
        const initRes = await client.post('/calls/initiate', { appointmentId, call_type: voiceOnly ? 'voice' : 'video' });
        const session = initRes.data || {};
        sessionId = session.session_id || session.id;
        if (!sessionId) throw new Error('no_session');
        sessionRef.current = sessionId;
      }

      const joinRes = await client.post(`/calls/${encodeURIComponent(sessionId)}/join`);
      const token = joinRes.data?.token;
      if (!token) throw new Error('no_token');
      const serverUrl = joinRes.data?.server_url || joinRes.data?.serverUrl || 'wss://live.nabd.plus';
      // the server's advice (weak link / server pressure): start with sound only
      const advice: AudioOnlyReason | null = joinRes.data?.audio_only && (joinRes.data.audio_only_reason === 'weak_link' || joinRes.data.audio_only_reason === 'server_pressure') ? joinRes.data.audio_only_reason : null;

      const room = new Room(callRoomOptions({ VideoPresets, AudioPresets }) as ConstructorParameters<typeof Room>[0]);

      room.on(RoomEvent.TrackSubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Video) setRemoteTrack(track);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Video) setRemoteTrack(null);
      });
      room.on(RoomEvent.LocalTrackPublished, (publication: any) => {
        if (publication.track?.kind === Track.Kind.Video) setLocalTrack(publication.track);
      });
      // Reconnecting / audio-only / quality / dropped: one tested state machine (src/calls/callResilience.ts)
      resilienceRef.current?.dispose();
      resilienceRef.current = bindCallResilience(room as any, { RoomEvent, ConnectionQuality, DisconnectReason } as any, {
        onPhase: (next) => {
          if (next === 'reconnecting') { setReconnecting(true); return; }
          if (next === 'live') { setReconnecting(false); return; }
          // 'dropped' (no connection for ~30 s, or the server ended it) or 'ended'
          setReconnecting(false);
          setRemoteTrack(null);
          setLocalTrack(null);
          if (next === 'dropped' && !(endedRef.current as boolean)) {
            // The call did not come back by itself: join again with backoff.
            const n = ((reconnectRef.current as number) || 0) + 1;
            (reconnectRef as any).current = n;
            if (n <= 3) {
              setPhase('connecting');
              setTimeout(() => { if (!(endedRef.current as boolean)) connect(); }, Math.min(2000 * n, 8000));
              return;
            }
            setErrMsg(AR ? 'انقطع الاتصال — تحقق من الشبكة ثم أعد المحاولة' : 'Connection lost — check your network and retry');
            setPhase('error');
          }
        },
        onAudioOnly: (on, reason) => { setAudioOnly(on ? reason : null); if (on) setCamOn(false); },
        onQuality: (_identity, level, local) => setQuality((q) => (local ? { ...q, local: level } : { ...q, remote: level })),
      }, { startAudioOnly: voiceOnly ? null : advice });

      // TURN/STUN with short-lived credentials from the server: a relay for networks that allow only HTTPS out
      const iceServers = (Array.isArray(joinRes.data?.ice_servers) ? joinRes.data.ice_servers : []).filter(
        (s: any) => s && Array.isArray(s.urls) && s.urls.length && s.urls.every((u: unknown) => typeof u === 'string' && /^(stun|turn|turns):/.test(u)),
      );
      await room.connect(serverUrl, token, iceServers.length ? { rtcConfig: { iceServers } } : undefined);
      try { await AudioSession.startAudioSession(); } catch { /* best-effort on Android/iOS */ }
      const media = await enableLocalMedia(room.localParticipant, advice ? { ...wantRef.current, camera: false } : wantRef.current);
      if (media.problem === 'mic_denied' || media.problem === 'mic_unavailable') {
        // No microphone means no consultation: leave the room instead of staying connected silently.
        setProblem(media.problem);
        throw new Error(media.problem);
      }
      if (advice) await resilienceRef.current?.applyStartAdvice();
      setProblem(media.problem || null);
      if (wantRef.current.camera && !media.camera) { wantRef.current = { ...wantRef.current, camera: false }; setCamOn(false); }

      if (attemptRef.current !== attempt) { room.disconnect(); return; }
      roomRef.current = room;
      reconnectRef.current = 0;
      setPhase('connected');
      startMetrics();
    } catch (e: any) {
      // A half-open room must not keep the microphone or camera running behind the error screen.
      if (room && roomRef.current !== room) { try { room.disconnect(); } catch { /* already closed */ } }
      if (attemptRef.current !== attempt) return;
      setErrMsg(e?.response?.data?.message || e?.message || 'connect_failed');
      setPhase('error');
    }
  };

  useEffect(() => {
    connect();
    return () => {
      attemptRef.current++;
      endedRef.current = true;
      stopMetrics();
      resilienceRef.current?.dispose();
      resilienceRef.current = null;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) room.disconnect();
      try { AudioSession.stopAudioSession(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => { wantRef.current = { ...wantRef.current, mic: micOn }; roomRef.current?.localParticipant.setMicrophoneEnabled(micOn).catch(() => {}); }, [micOn]);
  useEffect(() => {
    wantRef.current = { ...wantRef.current, camera: camOn };
    if (voiceOnly) return;
    // Turning the camera on after it was blocked asks again; if it is still blocked say so and stay off.
    void (async () => {
      const p = roomRef.current?.localParticipant;
      if (!p) return;
      try { await p.setCameraEnabled(camOn); if (camOn) setProblem(null); } catch (e) {
        if (camOn) { setProblem(isPermissionError(e) ? 'camera_denied' : 'camera_unavailable'); setCamOn(false); }
      }
    })();
  }, [camOn]);

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    endedRef.current = true;
    stopMetrics();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) room.disconnect();
    const sid = sessionRef.current;
    if (sid) {
      try { await client.post(`/calls/${encodeURIComponent(sid)}/end`); } catch { /* session end is best-effort; room is already closed */ }
    }
    onEnd();
  };

  if (phase === 'connecting') {
    return (
      <View style={[st.box, { backgroundColor: '#111' }]}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={st.dim}>{AR ? 'جاري الاتصال بغرفة الفيديو…' : 'Connecting to the video room…'}</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[st.box, { backgroundColor: '#111' }]}>
        <I name="video-off" size={40} color="#F66" />
        <Text style={st.dim}>
          {AR ? 'تعذر الاتصال بالغرفة — تحقق من الشبكة ثم أعد المحاولة' : 'Could not join the room — check your network and retry'}
        </Text>
        {problem === 'mic_denied' || problem === 'mic_unavailable'
          ? <Text style={st.dim}>{mediaProblemText(problem, AR)}</Text>
          : !!errMsg && <Text style={[st.dim, { fontSize: FS.xs }]}>{String(errMsg)}</Text>}
        {problem === 'mic_denied' && (
          <TouchableOpacity onPress={() => { void Linking.openSettings(); }} style={{ marginTop: SP.md }}>
            <Text style={[st.dim, { textDecorationLine: 'underline' }]}>{AR ? 'فتح إعدادات الجهاز' : 'Open device settings'}</Text>
          </TouchableOpacity>
        )}
        <View style={{ marginTop: SP.lg, width: 220 }}>
          <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={connect} />
        </View>
        <TouchableOpacity onPress={onEnd} style={{ marginTop: SP.md }}>
          <Text style={[st.dim, { textDecorationLine: 'underline' }]}>{AR ? 'العودة' : 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[st.box, { backgroundColor: '#000' }]}>
      {/* Remote (patient) video */}
      {remoteTrack && VideoView ? (
        <VideoView style={StyleSheet.absoluteFill as any} videoTrack={remoteTrack as any} />
      ) : (
        <View style={st.remoteFallback}>
          <View style={[st.avatar, { backgroundColor: theme.primary }]}>
            <I name="user" size={44} color="#FFF" />
          </View>
          <Text style={st.name}>{peerName || (AR ? 'المريض' : 'Patient')}</Text>
          <Text style={st.dim}>{AR ? 'في انتظار فيديو الطرف الآخر…' : 'Waiting for the remote video…'}</Text>
        </View>
      )}

      {/* Local PiP */}
      {!voiceOnly && (
        <View style={st.pip}>
          {localTrack && camOn && VideoView ? (
            <VideoView style={StyleSheet.absoluteFill as any} videoTrack={localTrack as any} mirror={true} />
          ) : (
            <View style={st.pipOff}><I name="video-off" size={22} color="#999" /></View>
          )}
        </View>
      )}

      {/* Camera blocked or missing: the call goes on with audio only, and says why */}
      {problem && (
        <View style={st.banner}>
          <Text style={st.bannerText}>{mediaProblemText(problem, AR)}</Text>
          {problem === 'camera_denied' && (
            <TouchableOpacity onPress={() => { void Linking.openSettings(); }}>
              <Text style={[st.bannerText, { textDecorationLine: 'underline' }]}>{AR ? 'فتح الإعدادات' : 'Open settings'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Status over the call: reconnecting (the same call resumes) and sound only (weak link) */}
      <View style={st.status} pointerEvents="box-none">
        {reconnecting ? <Text accessibilityLiveRegion="polite" style={[st.notice, { backgroundColor: theme.overlay }]}>{AR ? 'الاتصال ضعيف، نعيد الاتصال بالمكالمة…' : 'Weak connection. Reconnecting your call…'}</Text> : null}
        {audioOnly ? <Text accessibilityLiveRegion="polite" style={[st.notice, { backgroundColor: theme.overlay }]}>{AR ? 'الاتصال ضعيف، فأوقفنا الفيديو وأبقينا الصوت.' : 'The connection is weak, so video is off and the sound is kept.'}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View accessible accessibilityLabel={`${AR ? 'اتصالك' : 'Your connection'}: ${qualityText(quality.local, AR)}`} style={st.bars}>
            {[1, 2, 3].map((n) => <View key={n} style={[st.bar, { height: 4 + n * 4, opacity: n <= qualityBars(quality.local) ? 1 : 0.3 }]} />)}
          </View>
          <View accessible accessibilityLabel={`${AR ? 'اتصال الطرف الآخر' : "Other side's connection"}: ${qualityText(quality.remote, AR)}`} style={st.bars}>
            {[1, 2, 3].map((n) => <View key={n} style={[st.bar, { height: 4 + n * 4, opacity: n <= qualityBars(quality.remote) ? 1 : 0.3 }]} />)}
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={st.controls}>
        <TouchableOpacity style={st.ctrl} onPress={() => setMicOn(v => !v)} accessibilityLabel={AR ? 'كتم الصوت' : 'Mute'}>
          <I name={micOn ? 'mic' : 'mic-off'} size={22} color="#FFF" />
        </TouchableOpacity>
        {!voiceOnly && !audioOnly && (
          <TouchableOpacity style={st.ctrl} onPress={() => setCamOn(v => !v)} accessibilityLabel={AR ? 'الكاميرا' : 'Camera'}>
            <I name={camOn ? 'video' : 'video-off'} size={22} color="#FFF" />
          </TouchableOpacity>
        )}
        {!voiceOnly && audioOnly && (
          <TouchableOpacity style={st.ctrl} onPress={() => { setCamOn(true); void resilienceRef.current?.tryVideo(); }} accessibilityLabel={AR ? 'جرّب الفيديو مرة أخرى' : 'Try video again'}>
            <I name="video" size={22} color={C.white} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.ctrl, { backgroundColor: '#E53935' }]} onPress={handleEnd} accessibilityLabel={AR ? 'إنهاء المكالمة' : 'End call'}>
          <I name="phone-off" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function qualityText(level: QualityLevel, ar: boolean): string {
  const t: Record<QualityLevel, [string, string]> = {
    excellent: ['ممتاز', 'excellent'], good: ['جيد', 'good'], poor: ['ضعيف', 'weak'], lost: ['منقطع', 'lost'], unknown: ['جارٍ الفحص', 'checking'],
  };
  return t[level][ar ? 0 : 1];
}

const st = StyleSheet.create({
  status: { position: 'absolute', top: SP.md, start: 0, end: 0, alignItems: 'center', gap: 8 },
  notice: { color: C.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, textAlign: 'center', maxWidth: '92%', overflow: 'hidden' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 },
  bar: { width: 4, borderRadius: 1, backgroundColor: C.white },
  box: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', borderRadius: R.lg, overflow: 'hidden' },
  dim: { color: 'rgba(255,255,255,0.75)', marginTop: SP.sm, textAlign: 'center', paddingHorizontal: SP.lg },
  name: { color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold, marginTop: SP.sm },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  remoteFallback: { alignItems: 'center', justifyContent: 'center' },
  banner: { position: 'absolute', top: SP.md, start: SP.md, end: SP.md, padding: SP.sm, borderRadius: R.md, backgroundColor: withAlpha(tokens.navy, 0.65), alignItems: 'center' },
  bannerText: { color: tokens.primaryFg, fontSize: FS.xs, textAlign: 'center' },
  pip: { position: 'absolute', bottom: 96, right: SP.md, width: 92, height: 128, borderRadius: R.md, overflow: 'hidden', borderWidth: 2, borderColor: '#444', backgroundColor: '#222' },
  pipOff: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: SP.lg, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: SP.xl },
  ctrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

export default VideoCallRoom;
