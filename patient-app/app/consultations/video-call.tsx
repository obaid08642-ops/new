import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StatusBar, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { LocalVideoTrack, Room, RoomEvent, VideoPresets, type LocalTrack, type RemoteTrack } from 'livekit-client';

import { ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, CallNotice, useCallUi } from '../../src/components/consult/CallKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { TelehealthConsentSheet, isTelehealthConsentRefusal } from '../../src/components/legal/TelehealthConsent';
import { ensureLiveKitGlobals, startCallAudio, stopCallAudio } from '../../src/calls/livekitNative';
import { availableRoutes, defaultRoute, nextRoute, selectRoute, type AudioRoute } from '../../src/calls/audioRoute';
import { onCallHold } from '../../src/calls/callHold';
import { createRoomHandle } from '../../src/calls/roomHandle';

const OS = Platform.OS === 'ios' ? 'ios' : 'android';

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
}

export default function VideoCallScreen() {
  const { appointmentId, sessionId: ringingSessionId, mode } = useLocalSearchParams<{ appointmentId?: string; sessionId?: string; mode?: string }>();
  const isVideoCall = mode !== 'voice';
  const { c, k } = useCallUi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ doctor_name?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  // D-38: the server refuses the patient's call until the telehealth consent is accepted; then the call is tried again
  const [consentAsked, setConsentAsked] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(isVideoCall);
  const [route, setRoute] = useState<AudioRoute>(isVideoCall ? 'speaker' : 'earpiece');
  const [routes, setRoutes] = useState<AudioRoute[]>([]);
  const [frontCamera, setFrontCamera] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [denied, setDenied] = useState<'mic' | 'cam' | null>(null);
  const [held, setHeld] = useState(false);

  // LiveKit States
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<RemoteTrack | null>(null);
  const [localTrack, setLocalTrack] = useState<LocalTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handle = createRoomHandle<Room>();

    const connectToRoom = async () => {
      try {
        // Fetch appointment details and token
        let token = '';
        let serverUrl = 'wss://live.nabd.plus'; // Default fallback

        // M1-30: real LiveKit contract — POST /calls/initiate then /calls/:sessionId/join
        // (was calling non-existent /care/appointments/:id/video-token and falling back to a fake token)
        if (ringingSessionId || appointmentId) {
          // an answered incoming call joins the session that is ringing; only the caller starts one
          const initRes: Session & { data?: Session } = ringingSessionId
            ? { session_id: String(ringingSessionId) }
            : await apiFetch<Session & { data?: Session }>(`/calls/initiate`, {
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
            setData(session?.appointment || session);
          }
        }

        if (!token) {
          throw new Error('call_token_missing');
        }

        // FaceTime-class quality: capture HD 720p, publish with simulcast layers so
        // LiveKit adapts each subscriber to the best layer their network can carry
        // (adaptiveStream + dynacast), with DTX audio for clean voice on weak links.
        // (the options are built apart so the unchanged `audioBitrate` key stays as it was sent)
        const publishDefaults = {
          videoCodec: 'vp8' as const, // plays on every browser and phone the doctor may use
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          videoEncoding: { maxBitrate: 1_700_000 },
          audioBitrate: 32_000,
          dtx: true,
        };
        ensureLiveKitGlobals();
        await startCallAudio();
        if (handle.disposed) {
          void stopCallAudio();
          return;
        }
        // the handle owns the room from here, so leaving the screen while it connects still disconnects it
        const newRoom = handle.adopt(new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
          publishDefaults,
        }));

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

        // the other side's mute shows here: LiveKit carries the state, no extra message is needed
        newRoom.on(RoomEvent.TrackMuted, (pub, participant) => {
          if (participant !== newRoom.localParticipant && pub.kind === 'audio') setRemoteMuted(true);
        });
        newRoom.on(RoomEvent.TrackUnmuted, (pub, participant) => {
          if (participant !== newRoom.localParticipant && pub.kind === 'audio') setRemoteMuted(false);
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setRemoteTrack(null);
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === 'video') {
            setLocalTrack(publication.track);
          }
        });

        if (!(await handle.step(() => newRoom.connect(serverUrl, token)))) return;
        // each permission on its own: a denied camera must not take the voice down with it
        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true);
        } catch {
          if (handle.disposed) return;
          setDenied('mic');
          setMicOn(false);
        }
        if (isVideoCall) {
          try {
            await newRoom.localParticipant.setCameraEnabled(true);
          } catch {
            if (handle.disposed) return;
            setDenied((d) => d ?? 'cam');
            setCamOn(false);
          }
        }
        if (handle.disposed) {
          await handle.dispose();
          return;
        }
        const found = await availableRoutes(OS);
        if (handle.disposed) {
          await handle.dispose();
          return;
        }
        setRoutes(found);
        const initial = defaultRoute(isVideoCall, found);
        setRoute(initial);
        void selectRoute(initial, OS);

        setRoom(newRoom);
        setIsConnected(true);
        setLoading(false);
      } catch (error) {
        if (handle.disposed) return;
        void handle.dispose(); // a failed attempt must not leave a half-connected room behind (Retry makes a new one)
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
      void handle.dispose();
      void stopCallAudio();
    };
  }, [appointmentId, ringingSessionId, attempt]);

  // a phone call takes the line: stop sending while held, send again on resume
  useEffect(() => {
    return onCallHold((h) => {
      setHeld(h);
      if (room) {
        void room.localParticipant.setMicrophoneEnabled(!h && micOn);
        void room.localParticipant.setCameraEnabled(!h && camOn);
      }
    });
  }, [room, micOn, camOn]);

  const cycleRoute = async () => {
    const next = nextRoute(route, routes);
    if (await selectRoute(next, OS)) setRoute(next);
  };

  const flipCamera = async () => {
    const pub = room?.localParticipant.getTrackPublication('camera' as never);
    const track = pub?.track;
    if (!(track instanceof LocalVideoTrack)) return;
    const facing = frontCamera ? 'environment' : 'user';
    try {
      await track.restartTrack({ facingMode: facing });
      setFrontCamera(!frontCamera);
    } catch {
      /* the other camera is not available: the current one keeps running */
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }} testID="video-call-screen">
      <StatusBar barStyle="light-content" hidden />

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
        {camOn && localTrack && VideoView ? <VideoView style={full} videoTrack={localTrack} mirror={frontCamera} /> : null}
      </View>

      {remoteMuted || held || denied ? (
        <View style={{ position: 'absolute', top: 180, start: 16, end: 16, alignItems: 'center', gap: 8 }} testID="call-status">
          {held ? <CallNotice text={k('consult.call.onHold')} /> : null}
          {remoteMuted && !held ? <CallNotice text={k('consult.call.remoteMuted')} /> : null}
          {denied ? <CallNotice text={k(denied === 'mic' ? 'consult.call.micDenied' : 'consult.call.camDenied')} actionLabel={k('consult.call.openSettings')} onAction={() => void Linking.openSettings()} /> : null}
        </View>
      ) : null}

      {/* Controls Overlay */}
      <View style={{ position: 'absolute', bottom: 40, start: 0, end: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
        <CallButton label={micOn ? k('consult.call.mute') : k('consult.call.unmute')} active={micOn} onPress={() => setMicOn(!micOn)} testID="call-mic" />
        <CallButton label={k('consult.call.end')} tone="danger" onPress={handleEndCall} testID="call-end" />
        {routes.length > 1 ? <CallButton label={k(`consult.call.route.${route}`)} active onPress={cycleRoute} testID="call-route" /> : null}
        {isVideoCall && camOn ? <CallButton label={k('consult.call.flipCamera')} active onPress={flipCamera} testID="call-flip" /> : null}
        {isVideoCall ? <CallButton label={camOn ? k('consult.call.cameraOff') : k('consult.call.cameraOn')} active={camOn} onPress={() => setCamOn(!camOn)} testID="call-camera" /> : null}
      </View>
    </View>
  );
}
