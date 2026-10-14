import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Room, RoomEvent, VideoPresets, type LocalTrack, type RemoteTrack } from 'livekit-client';

import { ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, useCallUi } from '../../src/components/consult/CallKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';

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
  const { appointmentId } = useLocalSearchParams();
  const { c, k } = useCallUi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ doctor_name?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // LiveKit States
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<RemoteTrack | null>(null);
  const [localTrack, setLocalTrack] = useState<LocalTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let activeRoom: Room | null = null;

    const connectToRoom = async () => {
      try {
        // Fetch appointment details and token
        let token = '';
        let serverUrl = 'wss://live.nabd.plus'; // Default fallback

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
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          videoEncoding: { maxBitrate: 1_700_000 },
          audioBitrate: 32_000,
          dtx: true,
        };
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
          publishDefaults,
        });

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

        newRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setRemoteTrack(null);
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === 'video') {
            setLocalTrack(publication.track);
          }
        });

        await newRoom.connect(serverUrl, token);
        await newRoom.localParticipant.enableCameraAndMicrophone();

        setRoom(newRoom);
        setIsConnected(true);
        setLoading(false);
        activeRoom = newRoom;
      } catch (error) {
        logError('consultations:video-call:livekit', error);
        setFailed(true);
        setLoading(false);
      }
    };

    void connectToRoom();

    return () => {
      if (activeRoom) {
        void activeRoom.disconnect();
      }
    };
  }, [appointmentId]);

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
        {camOn && localTrack && VideoView ? <VideoView style={full} videoTrack={localTrack} mirror /> : null}
      </View>

      {/* Controls Overlay */}
      <View style={{ position: 'absolute', bottom: 40, start: 0, end: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
        <CallButton label={micOn ? k('consult.call.mute') : k('consult.call.unmute')} active={micOn} onPress={() => setMicOn(!micOn)} testID="call-mic" />
        <CallButton label={k('consult.call.end')} tone="danger" onPress={handleEndCall} testID="call-end" />
        <CallButton label={camOn ? k('consult.call.cameraOff') : k('consult.call.cameraOn')} active={camOn} onPress={() => setCamOn(!camOn)} testID="call-camera" />
      </View>
    </View>
  );
}
