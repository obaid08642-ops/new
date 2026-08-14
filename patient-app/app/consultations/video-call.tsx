// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { resolveColor } from "../../src/theme/colors";
import { apiFetch } from "../../src/utils/api";

import { Room, RoomEvent } from "livekit-client";
import { VideoView } from "@livekit/react-native";

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
        let serverUrl = "wss://livekit.nabdahplus.com"; // Default fallback

        if (appointmentId) {
          const res = await apiFetch(`/care/appointments/${appointmentId}/video-token`);
          resData = res?.data || res;
          token = resData?.token;
          serverUrl = resData?.serverUrl || serverUrl;
          setData(resData?.appointment || resData);
        }

        if (!token) {
          token = "session_token";
          setData({ doctor_name: "الطبيب المباشر" });
        }

        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
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
        {remoteTrack ? (
          <VideoView style={styles.fullVideo} videoTrack={remoteTrack} />
        ) : (
          <View style={styles.centerBox}>
            <View style={[styles.docAvatar, { backgroundColor: resolveColor("var(--ps)") }]}>
              <Text style={{ fontFamily: "MaterialSymbolsRounded", color: resolveColor("var(--p)"), fontSize: 60 }}>person</Text>
            </View>
            <Text style={styles.docName}>{data?.doctor_name}</Text>
            <Text style={styles.statusText}>{isConnected ? "في انتظار انضمام الطبيب..." : "غير متصل"}</Text>
          </View>
        )}
      </View>

      {/* Local Video Overlay */}
      <View style={styles.myCam}>
        {camOn && localTrack ? (
          <VideoView style={styles.fullVideo} videoTrack={localTrack} mirror={true} />
        ) : (
          <Text style={{ fontFamily: "MaterialSymbolsRounded", color: "rgba(255,255,255,.5)", fontSize: 36 }}>person</Text>
        )}
      </View>

      {/* Controls Overlay */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setMicOn(!micOn)}>
          <Text style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 26 }}>
            {micOn ? "mic" : "mic_off"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.endBtn, { backgroundColor: resolveColor("var(--cr)") }]} onPress={handleEndCall}>
          <Text style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 30 }}>call_end</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlBtn} onPress={() => setCamOn(!camOn)}>
          <Text style={{ fontFamily: "MaterialSymbolsRounded", color: "#fff", fontSize: 26 }}>
            {camOn ? "videocam" : "videocam_off"}
          </Text>
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
