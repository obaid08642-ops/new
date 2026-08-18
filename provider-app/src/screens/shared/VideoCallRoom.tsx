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
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Room, RoomEvent, VideoPresets, AudioPresets, Track } from 'livekit-client';
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
import { useTheme, useLang } from '../../context';
import { NBtn } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW, R } from '../../constants';

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

  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<string | null>(null);
  const attemptRef = useRef(0);

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
    const attempt = ++attemptRef.current;
    try {
      const initRes = await client.post('/calls/initiate', { appointmentId, call_type: voiceOnly ? 'voice' : 'video' });
      const session = initRes.data || {};
      const sessionId = session.session_id || session.id;
      if (!sessionId) throw new Error('no_session');
      sessionRef.current = sessionId;

      const joinRes = await client.post(`/calls/${encodeURIComponent(sessionId)}/join`);
      const token = joinRes.data?.token;
      if (!token) throw new Error('no_token');
      const serverUrl = joinRes.data?.server_url || joinRes.data?.serverUrl || 'wss://live.nabd.plus';

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          videoEncoding: { maxBitrate: 1_700_000 },
          audioPreset: AudioPresets.speech,
          dtx: true,
        },
      });

      room.on(RoomEvent.TrackSubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Video) setRemoteTrack(track);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Video) setRemoteTrack(null);
      });
      room.on(RoomEvent.LocalTrackPublished, (publication: any) => {
        if (publication.track?.kind === Track.Kind.Video) setLocalTrack(publication.track);
      });
      room.on(RoomEvent.Disconnected, () => {
        setRemoteTrack(null);
        setLocalTrack(null);
      });

      await room.connect(serverUrl, token);
      try { await AudioSession.startAudioSession(); } catch { /* best-effort on Android/iOS */ }
      if (voiceOnly) {
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        await room.localParticipant.enableCameraAndMicrophone();
      }

      if (attemptRef.current !== attempt) { room.disconnect(); return; }
      roomRef.current = room;
      setPhase('connected');
    } catch (e: any) {
      if (attemptRef.current !== attempt) return;
      setErrMsg(e?.response?.data?.message || e?.message || 'connect_failed');
      setPhase('error');
    }
  };

  useEffect(() => {
    connect();
    return () => {
      attemptRef.current++;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) room.disconnect();
      try { AudioSession.stopAudioSession(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => { roomRef.current?.localParticipant.setMicrophoneEnabled(micOn).catch(() => {}); }, [micOn]);
  useEffect(() => { if (!voiceOnly) roomRef.current?.localParticipant.setCameraEnabled(camOn).catch(() => {}); }, [camOn]);

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
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
        {!!errMsg && <Text style={[st.dim, { fontSize: FS.xs }]}>{String(errMsg)}</Text>}
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

      {/* Controls */}
      <View style={st.controls}>
        <TouchableOpacity style={st.ctrl} onPress={() => setMicOn(v => !v)} accessibilityLabel={AR ? 'كتم الصوت' : 'Mute'}>
          <I name={micOn ? 'mic' : 'mic-off'} size={22} color="#FFF" />
        </TouchableOpacity>
        {!voiceOnly && (
          <TouchableOpacity style={st.ctrl} onPress={() => setCamOn(v => !v)} accessibilityLabel={AR ? 'الكاميرا' : 'Camera'}>
            <I name={camOn ? 'video' : 'video-off'} size={22} color="#FFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.ctrl, { backgroundColor: '#E53935' }]} onPress={handleEnd} accessibilityLabel={AR ? 'إنهاء المكالمة' : 'End call'}>
          <I name="phone-off" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', borderRadius: R.lg, overflow: 'hidden' },
  dim: { color: 'rgba(255,255,255,0.75)', marginTop: SP.sm, textAlign: 'center', paddingHorizontal: SP.lg },
  name: { color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold, marginTop: SP.sm },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  remoteFallback: { alignItems: 'center', justifyContent: 'center' },
  pip: { position: 'absolute', bottom: 96, right: SP.md, width: 92, height: 128, borderRadius: R.md, overflow: 'hidden', borderWidth: 2, borderColor: '#444', backgroundColor: '#222' },
  pipOff: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: SP.lg, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: SP.xl },
  ctrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

export default VideoCallRoom;
