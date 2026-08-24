// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
// @livekit/react-native is a NATIVE module — absent in Expo Go. A static
// import crashes module evaluation so the default export never registers
// (Metro: "missing the required default export"). Load defensively.
let LiveKitRoom: any = null;
let VideoTrack: any = null;
let useRoomContext: any = () => null;
let useTracks: any = () => [];
let useLocalParticipant: any = () => ({ localParticipant: null });
let Track: any = { Source: { Camera: 'camera' } };
let LIVEKIT_NATIVE_OK = false;
try {
  const lk = require('@livekit/react-native');
  LiveKitRoom = lk.LiveKitRoom;
  VideoTrack = lk.VideoTrack;
  useRoomContext = lk.useRoomContext;
  useTracks = lk.useTracks;
  useLocalParticipant = lk.useLocalParticipant;
  Track = require('livekit-client').Track;
  LIVEKIT_NATIVE_OK = !!LiveKitRoom;
} catch {
  LIVEKIT_NATIVE_OK = false;
}
import { HttpClient } from '@/services/HttpClient';
import { DSText } from '@/design-system';

// Local token shim — the DS barrel doesn't export a DSTokens object; using it
// crashed module evaluation (TypeError: colors of undefined) and the route
// lost its default export in Metro.
const DSTokens = {
  colors: {
    primary: { main: '#0EA5E9' },
    error: { main: '#EF4444' },
    base: { white: '#FFFFFF' },
    text: { secondary: '#94A3B8' },
    background: { default: '#0F172A' },
  },
};
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/store';

// Set up server URL (can be from env)
const liveKitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://live.nabd.plus';

const ActiveCallView = ({ onEndCall }: { onEndCall: () => void }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  // Get remote video tracks
  const remoteVideoTracks = useTracks([Track.Source.Camera]).filter(
    (tr) => tr.participant.identity !== localParticipant.identity
  );

  // Get local video track
  const localVideoTrack = useTracks([Track.Source.Camera]).find(
    (tr) => tr.participant.identity === localParticipant.identity
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const toggleMic = () => {
    const enabled = !isMuted;
    localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  };

  const toggleCamera = () => {
    const enabled = !isCameraOff;
    localParticipant.setCameraEnabled(!enabled);
    setIsCameraOff(enabled);
  };

  return (
    <View style={styles.callContainer}>
      {/* Remote Participant Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteVideoTracks.length > 0 ? (
          <VideoTrack
            trackRef={remoteVideoTracks[0]}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color={DSTokens.colors.primary.main} />
            <DSText variant="body" color={DSTokens.colors.text.secondary} style={{ marginTop: 12 }}>
              بانتظار انضمام الطبيب...
            </DSText>
          </View>
        )}
      </View>

      {/* Local Participant Video (PiP) */}
      <View style={styles.localVideoContainer}>
        {localVideoTrack && !isCameraOff ? (
          <VideoTrack
            trackRef={localVideoTrack}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View style={styles.cameraOffPlaceholder}>
            <MaterialCommunityIcons name="video-off" size={32} color={DSTokens.colors.base.white} />
          </View>
        )}
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMic}
        >
          <MaterialCommunityIcons
            name={isMuted ? "microphone-off" : "microphone"}
            size={28}
            color={DSTokens.colors.base.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
        >
          <MaterialCommunityIcons name="phone-hangup" size={32} color={DSTokens.colors.base.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
          onPress={toggleCamera}
        >
          <MaterialCommunityIcons
            name={isCameraOff ? "video-off" : "video"}
            size={28}
            color={DSTokens.colors.base.white}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAppSelector(state => state.auth.user);

  useEffect(() => {
    if (!LIVEKIT_NATIVE_OK) {
      setError('مكالمات الفيديو تتطلب نسخة التطبيق الكاملة (Development Build) ولا تعمل داخل Expo Go.');
      return;
    }
    // Fetch LiveKit token from backend
    const fetchToken = async () => {
      try {
        if (!user) throw new Error('User not authenticated');
        const response = await HttpClient.post<{ token: string }>(`/calls/${id}/join`, {});
        setToken(response.data.token);
      } catch (err) {
        console.error('Failed to get token', err);
        setError('تعذر الانضمام للغرفة. يرجى التأكد من الموعد.');
      }
    };

    if (id) fetchToken();
  }, [id, user]);

  const handleDisconnect = () => {
    router.back();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={DSTokens.colors.error.main} />
        <DSText variant="h3" style={{ marginVertical: 12 }}>خطأ في الاتصال</DSText>
        <DSText variant="body" color={DSTokens.colors.text.secondary}>{error}</DSText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <DSText variant="button" color={DSTokens.colors.base.white}>العودة للاستشارات</DSText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={DSTokens.colors.primary.main} />
        <DSText variant="body" style={{ marginTop: 12 }}>جاري تحضير غرفة الاستشارة...</DSText>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LiveKitRoom
        serverUrl={liveKitUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleDisconnect}
      >
        <ActiveCallView onEndCall={handleDisconnect} />
      </LiveKitRoom>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: DSTokens.colors.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  callContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 110,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#333',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cameraOffPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: DSTokens.colors.error.main,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DSTokens.colors.error.main,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: DSTokens.colors.primary.main,
    borderRadius: 24,
  }
});
