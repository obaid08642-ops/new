import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AudioPresets, ConnectionQuality, DisconnectReason, Room, RoomEvent, VideoPresets, type LocalTrack, type RemoteTrack } from 'livekit-client';

import { ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, CallNotice, QualityBars, useCallUi } from '../../src/components/consult/CallKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { TelehealthConsentSheet, isTelehealthConsentRefusal } from '../../src/components/legal/TelehealthConsent';
import { ensureLiveKitGlobals, startCallAudio, stopCallAudio } from '../../src/calls/livekitNative';
import { bindCallResilience, callRoomOptions, qualityBars, type AudioOnlyReason, type CallPhase, type QualityLevel } from '../../src/calls/callResilience';

/**
 * Video call — no board (owner decision, 2026-10-04): the layout stays, drawn with the dark tokens, the font and
 * labelled controls. The connection is what it was: POST /calls/initiate then POST /calls/:sessionId/join, a LiveKit
 * room with simulcast, and the rating screen on hang-up. Nothing of the signalling or the media changed.
 */

type VideoViewType = React.ComponentType<{ style?: object; videoTrack: unknown; mirror?: boolean }> | null;

// @livekit/react-native is a NATIVE module — absent in Expo Go. Loading it
// statically crashes the whole screen with Invariant Violation there, so we
// load it defensively and fall back to the audio-style UI when unavailable.
let VideoView: VideoViewType = null;
try {
  VideoView = require('@livekit/react-native').VideoView; // eslint-disable-line @typescript-eslint/no-require-imports
} catch {
  VideoView = null;
}

// WebRTC globals before the first Room (livekit-client needs them on a native build)
ensureLiveKitGlobals();

interface Session {
  session_id?: string;
  id?: string;
  doctor_name?: string;
  appointment?: { doctor_name?: string };
}
interface Join {
  token?: string;
  livekit_token?: string;
  server_url?: string;
  serverUrl?: string;
  /** The server's advice (weak link, server pressure): start with sound only. */
  audio_only?: boolean;
  audio_only_reason?: AudioOnlyReason | null;
}

export default function VideoCallScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { c, k } = useCallUi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ doctor_name?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  // D-38: the server refuses the patient's call until the telehealth consent is accepted; then the call is tried again
  const [consentAsked, setConsentAsked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // LiveKit States
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<RemoteTrack | null>(null);
  const [localTrack, setLocalTrack] = useState<LocalTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [audioOnly, setAudioOnly] = useState<AudioOnlyReason | 'user' | null>(null);
  const [quality, setQuality] = useState<{ local: QualityLevel; remote: QualityLevel }>({ local: 'unknown', remote: 'unknown' });
  const resilience = useRef<ReturnType<typeof bindCallResilience> | null>(null);

  useEffect(() => {
    let activeRoom: Room | null = null;

    const connectToRoom = async () => {
      try {
        // Fetch appointment details and token
        let token = '';
        let serverUrl = 'wss://live.nabd.plus'; // Default fallback
        let advice: AudioOnlyReason | null = null;

        // M1-30: real LiveKit contract — POST /calls/initiate then /calls/:sessionId/join
        // (was calling non-existent /care/appointments/:id/video-token and falling back to a fake token)
        if (appointmentId) {
          const initRes = await apiFetch<Session & { data?: Session }>(`/calls/initiate`, {
            method: 'POST',
            body: JSON.stringify({ appointmentId, call_type: 'video' }),
          });
          const session = initRes?.data || initRes;
          const sessionId = session?.session_id || session?.id;
          if (sessionId) {
            const joinRes = await apiFetch<Join & { data?: Join }>(`/calls/${sessionId}/join`, { method: 'POST' });
            const resData = joinRes?.data || joinRes;
            token = resData?.token || resData?.livekit_token || '';
            serverUrl = resData?.server_url || resData?.serverUrl || serverUrl;
            if (resData?.audio_only && (resData.audio_only_reason === 'weak_link' || resData.audio_only_reason === 'server_pressure')) advice = resData.audio_only_reason;
            setData(session?.appointment || session);
          }
        }

        if (!token) {
          throw new Error('call_token_missing');
        }

        // FaceTime-class quality: capture HD 720p, publish with simulcast layers so LiveKit adapts each subscriber to the best layer
        // their network can carry (adaptiveStream + dynacast), with DTX speech audio for clean voice on weak links.
        ensureLiveKitGlobals();
        await startCallAudio();
        const newRoom = new Room(callRoomOptions({ VideoPresets, AudioPresets }) as ConstructorParameters<typeof Room>[0]);

        // Event listeners
        newRoom.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video') {
            setRemoteTrack(track);
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === 'video') {
            setRemoteTrack(null);
          }
        });

        // Reconnecting / audio-only / quality / dropped: one tested state machine (src/calls/callResilience.ts)
        resilience.current = bindCallResilience(newRoom as never, { RoomEvent, ConnectionQuality, DisconnectReason } as never, {
          onPhase: (next) => {
            setPhase(next);
            if (next === 'dropped' || next === 'ended') { setIsConnected(false); setRemoteTrack(null); }
          },
          onAudioOnly: (on, reason) => { setAudioOnly(on ? reason : null); if (on) setCamOn(false); },
          onQuality: (identity, level, local) => setQuality((q) => (local ? { ...q, local: level } : { ...q, remote: level })),
        }, { startAudioOnly: advice });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === 'video') {
            setLocalTrack(publication.track);
          }
        });

        await newRoom.connect(serverUrl, token);
        if (advice) {
          // the server advises sound only (weak link / server pressure): the microphone only, the camera stays off until the user asks for it
          await newRoom.localParticipant.setMicrophoneEnabled(true);
          await resilience.current?.applyStartAdvice();
        } else {
          await newRoom.localParticipant.enableCameraAndMicrophone();
        }
        setPhase('live');

        setRoom(newRoom);
        setIsConnected(true);
        setLoading(false);
        activeRoom = newRoom;
      } catch (error) {
        if (isTelehealthConsentRefusal(error)) {
          setConsentAsked(true);
          setLoading(false);
          return;
        }
        logError('consultations:video-call:livekit', error);
        setFailed(true);
        setLoading(false);
      }
    };

    void connectToRoom();

    return () => {
      resilience.current?.dispose();
      resilience.current = null;
      if (activeRoom) {
        void activeRoom.disconnect();
      }
      void stopCallAudio();
    };
  }, [appointmentId, attempt]);

  // Toggle Camera
  useEffect(() => {
    if (room && room.localParticipant) {
      void room.localParticipant.setCameraEnabled(camOn);
    }
  }, [camOn, room]);

  // Toggle Mic
  useEffect(() => {
    if (room && room.localParticipant) {
      void room.localParticipant.setMicrophoneEnabled(micOn);
    }
  }, [micOn, room]);

  const handleEndCall = () => {
    if (room) {
      void room.disconnect();
    }
    router.replace({ pathname: '/consultations/post-call-rating', params: { appointmentId } } as unknown as Href);
  };

  const continueInChat = () => {
    router.replace({ pathname: '/consultations/chat-with-doctor', params: { appointmentId: String(appointmentId ?? '') } } as unknown as Href);
  };
  const tryVideo = () => {
    setCamOn(true);
    void resilience.current?.tryVideo();
  };
  const levelText = (level: QualityLevel) => k(`consult.call.quality.${level}`);
  const full = { width: '100%', height: '100%' } as const;

  if (consentAsked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
        <TelehealthConsentSheet
          open
          onClose={() => router.back()}
          onAccepted={() => {
            setConsentAsked(false);
            setLoading(true);
            setAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel={k('consult.loading')} color={c.text.primary} size="large" />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas, justifyContent: 'center', padding: 24 }}>
        <ErrorState title={k('consult.call.startFailed')} body={k('consult.call.startFailedBody')} retryLabel={k('consult.back')} onRetry={() => router.back()} theme="dark" />
      </View>
    );
  }

  if (phase === 'dropped') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg.canvas, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }} testID="call-dropped">
        <CallIdentity name={data?.doctor_name ?? ''} line={k('consult.call.dropped')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          <CallButton label={k('consult.call.continueInChat')} onPress={continueInChat} testID="call-continue-chat" />
          <CallButton label={k('consult.call.backToConsult')} tone="danger" onPress={() => router.replace('/consultations' as unknown as Href)} testID="call-dropped-back" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }} testID="video-call-screen">
      <StatusBar barStyle="light-content" hidden />

      {/* Status over the call: reconnecting (the same call resumes) and sound only (weak link) */}
      <View style={{ position: 'absolute', top: 12, start: 0, end: 0, zIndex: 2, gap: 8, alignItems: 'center' }} pointerEvents="box-none">
        {phase === 'reconnecting' ? <CallNotice text={k('consult.call.reconnecting')} testID="call-reconnecting" /> : null}
        {audioOnly ? <CallNotice text={k('consult.call.audioOnly')} testID="call-audio-only" /> : null}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <QualityBars bars={qualityBars(quality.local)} label={`${k('consult.call.qualityYou')}: ${levelText(quality.local)}`} testID="call-quality-local" />
          <QualityBars bars={qualityBars(quality.remote)} label={`${k('consult.call.qualityOther')}: ${levelText(quality.remote)}`} testID="call-quality-remote" />
        </View>
      </View>

      {/* Remote Video Background */}
      <View style={{ position: 'absolute', top: 0, start: 0, end: 0, bottom: 0 }}>
        {remoteTrack && VideoView ? (
          <VideoView style={full} videoTrack={remoteTrack} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <CallIdentity name={data?.doctor_name ?? ''} line={isConnected ? k('consult.call.waitingDoctor') : k('consult.call.disconnected')} />
          </View>
        )}
      </View>

      {/* Local Video Overlay */}
      <View style={{ position: 'absolute', top: 50, start: 20, width: 90, height: 120, borderRadius: 14, backgroundColor: c.bg.elevated, borderWidth: 2, borderColor: c.border.strong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {camOn && localTrack && VideoView ? <VideoView style={full} videoTrack={localTrack} mirror /> : null}
      </View>

      {/* Controls Overlay */}
      <View style={{ position: 'absolute', bottom: 40, start: 0, end: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
        <CallButton label={micOn ? k('consult.call.mute') : k('consult.call.unmute')} active={micOn} onPress={() => setMicOn(!micOn)} testID="call-mic" />
        <CallButton label={k('consult.call.end')} tone="danger" onPress={handleEndCall} testID="call-end" />
        {audioOnly ? (
          <CallButton label={k('consult.call.tryVideo')} onPress={tryVideo} testID="call-try-video" />
        ) : (
          <CallButton label={camOn ? k('consult.call.cameraOff') : k('consult.call.cameraOn')} active={camOn} onPress={() => setCamOn(!camOn)} testID="call-camera" />
        )}
      </View>
    </View>
  );
}
