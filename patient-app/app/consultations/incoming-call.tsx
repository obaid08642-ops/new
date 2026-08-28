// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function IncomingCallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const params = useLocalSearchParams();

  const callerId = (params.callerId as string) || undefined;
  const callerName = (params.callerName as string) || "مكالمة واردة";
  const sessionId = params.sessionId as string;
  const callType = (params.callType as "voice" | "video") || "video";

  const [ringTime, setRingTime] = useState(0);

  // Vibrate / ring simulator
  useEffect(() => {
    // Vibrate pattern: wait 1s, vibrate 1.5s, wait 1s
    const pattern = [1000, 1500, 1000];
    Vibration.vibrate(pattern, true);

    const t = setInterval(() => {
      setRingTime((p) => {
        if (p >= 35) {
          // Timeout call after 35 seconds of ringing
          handleReject();
          return p;
        }
        return p + 1;
      });
    }, 1000);

    return () => {
      Vibration.cancel();
      clearInterval(t);
    };
  }, [sessionId]);

  const handleAccept = () => {
    Vibration.cancel();
    router.replace({
      pathname: "/consultations/video-call",
      params: { sessionId, mode: callType },
    });
  };

  const handleReject = async () => {
    Vibration.cancel();
    if (sessionId) {
      try {
        await apiFetch(`/calls/${sessionId}/reject`, { method: "POST" });
      } catch (err) {
        console.warn("Could not reject call", err);
      }
    }
    router.back();
  };

  return (
    <View style={[st.c, { backgroundColor: "#090D14" }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Section */}
      <View style={[st.top, { paddingTop: insets.top + 60 }]}>
        <View style={st.avatarWrap}>
          <Icon name="doctor" size={72} color="rgba(255,255,255,0.7)" />
        </View>
        <AppText variant="h3" color="#fff" style={st.name}>
          {callerName}
        </AppText>
        <AppText variant="bodyMD" color="rgba(255,255,255,0.5)">
          {callType === "video"
            ? "مكالمة فيديو واردة..."
            : "مكالمة صوتية واردة..."}
        </AppText>
      </View>

      {/* Bottom Controls */}
      <View style={[st.bottom, { paddingBottom: insets.bottom + 60 }]}>
        <View style={st.buttonsRow}>
          {/* Reject Button */}
          <TouchableOpacity onPress={handleReject} style={[st.btn, st.reject]}>
            <Icon name="call" size={32} color="#fff" style={st.rejectIcon} />
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity onPress={handleAccept} style={[st.btn, st.accept]}>
            <Icon name="call" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={st.labelsRow}>
          <AppText variant="labelMD" color="rgba(255,255,255,0.6)">
            رفض
          </AppText>
          <AppText variant="labelMD" color="rgba(255,255,255,0.6)">
            قبول
          </AppText>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, justifyContent: "space-between", alignItems: "center" },
  top: { alignItems: "center", width: "100%" },
  avatarWrap: {
    width: 140,
    height: 140,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  name: { marginTop: 24, marginBottom: 8, fontWeight: "800" },
  bottom: { width: "100%", alignItems: "center" },
  buttonsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 12,
  },
  labelsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    width: "80%",
    paddingHorizontal: 12,
  },
  btn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  reject: { backgroundColor: "#F0695C", shadowColor: "#F0695C" },
  rejectIcon: { transform: [{ rotate: "135deg" }] },
  accept: { backgroundColor: "#10B981", shadowColor: "#10B981" },
});
