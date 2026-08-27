// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { resolveColor } from "../../src/theme/colors";
import { apiFetch } from "../../src/utils/api";

import { Room, RoomEvent, VideoPresets } from "livekit-client";
import { LocalizedText } from '../../src/components/LocalizedText';

// @livekit/react-native is a NATIVE module — absent in Expo Go. Loading it
// statically crashes the whole screen with Invariant Violation there, so we
// load it defensively and fall back to the audio-style UI when unavailable.
let VideoView: any = null;
try {
  VideoView = require("@livekit/react-native").VideoView;
} catch {
  VideoView = null;
}

export default function VideoCallScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { lang } = useApp() as any;
  const isRTL = lang === "ar" || lang === "ur";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // LiveKit States
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<any>(null);
  const [localTrack, setLocalTrack] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let activeRoom: Room | null = null;

    const connectToRoom = async () => {
      try {
        // Fetch appointment details and token
        let resData: any = null;
        let token = "";
        let serverUrl = "wss://live.nabd.plus"; // Default fallback

        // M1-30: real LiveKit contract — POST /calls/initiate then /calls/:sessionId/join
        // (was calling non-existent /care/appointments/:id/video-token and falling back to a fake token)
        if (appointmentId) {
          const initRes = await apiFetch(`/calls/initiate`, {
            method: 'POST',
            body: JSON.stringify({ appointmentId, call_type: 'video' }),
          });
          const session = initRes?.data || initRes;
          const sessionId = session?.session_id || session?.id;
          if (sessionId) {
            const joinRes = await apiFetch(`/calls/${sessionId}/join`, { method: 'POST' });
            resData = joinRes?.data || joinRes;
            token = resData?.token || resData?.livekit_token;
            serverUrl = resData?.server_url || resData?.serverUrl || serverUrl;
            setData(session?.appointment || session);
          }
        }

        if (!token) {
          throw new Error('تعذر بدء غرفة الفيديو — لم يصل رمز اتصال صالح من الخادم');
        }

        // FaceTime-class quality: capture HD 720p, publish with simulcast layers so
        // LiveKit adapts each subscriber to the best layer their network can carry
        // (adaptiveStream + dynacast), with DTX audio for clean voice on weak links.
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
          publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
            videoEncoding: { maxBitrate: 1_700_000 },
            audioBitrate: 32_000,
            dtx: true,
          },
        });

        // Event listeners
        newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === "video") {
            setRemoteTrack(track);
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (track.kind === "video") {
            setRemoteTrack(null);
          }
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setRemoteTrack(null);
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === "video") {
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
        console.log("Failed to connect to LiveKit", error);
        setLoading(false);
      }
    };

    connectToRoom();

    return () => {
      if (activeRoom) {
        activeRoom.disconnect();
      }
    };
  }, [appointmentId]);

  // Toggle Camera
  useEffect(() => {
    if (room && room.localParticipant) {
      room.localParticipant.setCameraEnabled(camOn);
    }
  }, [camOn, room]);

  // Toggle Mic
  useEffect(() => {
    if (room && room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(micOn);
    }
  }, [micOn, room]);

  const handleEndCall = () => {
    if (room) {
      room.disconnect();
    }
    router.replace({
      pathname: "/consultations/post-call-rating",
      params: { appointmentId },
    });
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: "50%" }} />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />
      
      {/* Remote Video Background */}
      <View style={styles.bg}>
        {remoteTrack && VideoView ? (
          <VideoView style={styles.fullVideo} videoTrack={remoteTrack} />
        ) : (
          <View style={styles.centerBox}>
            <View style={[styles.docAvatar, { backgroundColor: resolveColor("var(--ps)") }]}>
              <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: resolveColor("var(--p)"), fontSize: 60 }}>person</LocalizedText>
            </View>
            <LocalizedText style={styles.docName}>{data?.doctor_name}</LocalizedText>
            <LocalizedText style={styles.statusText}>{isConnected ? "في انتظار انضمام الطبيب..." : "غير متصل"}</LocalizedText>
          </View>
        )}
      </View>

      {/* Local Video Overlay */}
      <View style={styles.myCam}>
        {camOn && localTrack && VideoView ? (
          <VideoView style={styles.fullVideo} videoTrack={localTrack} mirror={true} />
        ) : (
          <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: "rgba(255,255,255,.5)", fontSize: 36 }}>person</LocalizedText>
        )}
      </View>

      {/* Controls Overlay */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setMicOn(!micOn)}>
          <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 26 }}>
            {micOn ? "mic" : "mic_off"}
          </LocalizedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.endBtn, { backgroundColor: resolveColor("var(--cr)") }]} onPress={handleEndCall}>
          <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 30 }}>call_end</LocalizedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlBtn} onPress={() => setCamOn(!camOn)}>
          <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 26 }}>
            {camOn ? "videocam" : "videocam_off"}
          </LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E18" },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  fullVideo: { width: "100%", height: "100%" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  docAvatar: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  docName: { fontSize: 16, fontWeight: "700", color: "#fff" },
  statusText: { fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 4 },
  myCam: {
    position: "absolute", top: 50, left: 20, width: 90, height: 120,
    borderRadius: 14, backgroundColor: "#2A3450", borderWidth: 2,
    borderColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center", overflow: "hidden"
  },
  bottomControls: {
    position: "absolute", bottom: 40, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 16,
  },
  controlBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center", marginHorizontal: 8,
  },
  endBtn: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
    shadowColor: "#F0695C", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 8, marginHorizontal: 8,
  },
});
