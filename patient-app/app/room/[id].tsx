import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { HttpClient } from '@/services/HttpClient';
import { useAppSelector } from '@/store/hooks';

import { ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, useCallUi } from '../../src/components/consult/CallKit';
import { step as scale } from '../../src/components/screen/ScreenKit';
import { logError } from '../../src/utils/logger';

/**
 * Call room — no board (owner decision, 2026-10-04): the layout stays (the other side full screen, a small picture of
 * yourself, mute / end / camera), drawn with the dark tokens and labelled controls. The token is POST /calls/:id/join and
 * the room is LiveKit's, exactly as before.
 */

interface Participant {
  identity: string;
  setMicrophoneEnabled: (on: boolean) => unknown;
  setCameraEnabled: (on: boolean) => unknown;
}
interface TrackRef {
  participant: { identity: string };
}
type NativeView = React.ComponentType<Record<string, unknown>> | null;

// @livekit/react-native is a NATIVE module — absent in Expo Go. A static
// import crashes module evaluation so the default export never registers
// (Metro: "missing the required default export"). Load defensively.
let LiveKitRoom: NativeView = null;
let VideoTrack: NativeView = null;
let useTracks: (sources: unknown[]) => TrackRef[] = () => [];
let useLocalParticipant: () => { localParticipant: Participant | null } = () => ({ localParticipant: null });
let CameraSource: unknown = 'camera';
let LIVEKIT_NATIVE_OK = false;
try {
  const lk = require('@livekit/react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
  LiveKitRoom = lk.LiveKitRoom;
  VideoTrack = lk.VideoTrack;
  useTracks = lk.useTracks;
  useLocalParticipant = lk.useLocalParticipant;
  CameraSource = require('livekit-client').Track.Source.Camera; // eslint-disable-line @typescript-eslint/no-require-imports
  LIVEKIT_NATIVE_OK = !!LiveKitRoom;
} catch {
  LIVEKIT_NATIVE_OK = false;
}

// Set up server URL (can be from env)
const liveKitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://live.nabd.plus';

const ActiveCallView = ({ onEndCall }: { onEndCall: () => void }) => {
  const { c, k } = useCallUi();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([CameraSource]);

  // Get remote video tracks
  const remoteVideoTracks = tracks.filter((tr) => tr.participant.identity !== localParticipant?.identity);
  // Get local video track
  const localVideoTrack = tracks.find((tr) => tr.participant.identity === localParticipant?.identity);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const toggleMic = () => {
    const enabled = !isMuted;
    void localParticipant?.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  };

  const toggleCamera = () => {
    const enabled = !isCameraOff;
    void localParticipant?.setCameraEnabled(!enabled);
    setIsCameraOff(enabled);
  };

  const Video = VideoTrack;
  return (
    <View style={{ flex: 1 }}>
      {/* Remote Participant Video (Full Screen) */}
      <View style={{ flex: 1, backgroundColor: c.bg.canvas }}>
        {remoteVideoTracks.length > 0 && Video ? (
          <Video trackRef={remoteVideoTracks[0]} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator accessibilityLabel={k('consult.loading')} size="large" color={c.text.primary} />
            <CallIdentity name="" line={k('consult.call.waitingDoctor')} />
          </View>
        )}
      </View>

      {/* Local Participant Video (PiP) */}
      <View style={{ position: 'absolute', top: 50, end: 20, width: 110, height: 150, borderRadius: 14, backgroundColor: c.bg.elevated, overflow: 'hidden', borderWidth: 2, borderColor: c.border.strong }}>
        {localVideoTrack && !isCameraOff && Video ? <Video trackRef={localVideoTrack} style={StyleSheet.absoluteFill} /> : null}
      </View>

      {/* Call Controls */}
      <View style={{ position: 'absolute', bottom: 40, start: 0, end: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
        <CallButton label={isMuted ? k('consult.call.unmute') : k('consult.call.mute')} active={!isMuted} onPress={toggleMic} testID="room-mic" />
        <CallButton label={k('consult.call.end')} tone="danger" onPress={onEndCall} testID="room-end" />
        <CallButton label={isCameraOff ? k('consult.call.cameraOn') : k('consult.call.cameraOff')} active={!isCameraOff} onPress={toggleCamera} testID="room-camera" />
      </View>
    </View>
  );
};

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tk, c, k } = useCallUi();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (!LIVEKIT_NATIVE_OK) {
      setError(k('consult.call.needsBuild'));
      return;
    }
    // Fetch LiveKit token from backend
    const fetchToken = async () => {
      try {
        if (!user) throw new Error('User not authenticated');
        const response = await HttpClient.post<{ token: string }>(`/calls/${id}/join`, {});
        setToken(response.data.token);
      } catch (err) {
        logError('room:get-token', err);
        setError(k('consult.call.joinFailed'));
      }
    };

    if (id) void fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleDisconnect = () => {
    router.back();
  };

  const shell = { flex: 1, backgroundColor: c.bg.canvas, justifyContent: 'center', alignItems: 'center', padding: 24 } as const;

  if (error) {
    return (
      <View style={shell}>
        <ErrorState title={k('consult.call.connectionError')} body={error} retryLabel={k('consult.call.backToConsult')} onRetry={() => router.back()} theme="dark" />
      </View>
    );
  }

  if (!token || !LiveKitRoom) {
    return (
      <View style={shell}>
        <ActivityIndicator accessibilityLabel={k('consult.call.preparing')} size="large" color={c.text.primary} />
        <Text style={{ ...scale(tk, 'small', 'regular'), color: c.text.onInverseSecondary, marginTop: 12 }}>{k('consult.call.preparing')}</Text>
      </View>
    );
  }

  const Room = LiveKitRoom;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg.canvas }} testID="room-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <Room serverUrl={liveKitUrl} token={token} connect audio video onDisconnected={handleDisconnect}>
        <ActiveCallView onEndCall={handleDisconnect} />
      </Room>
    </View>
  );
}
