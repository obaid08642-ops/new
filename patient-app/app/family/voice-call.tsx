// @ts-nocheck
// family/voice-call.tsx — Voice call between family members
import React, { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Avatar } from "../../src/components/ui";

export default function FamilyVoiceCallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <View style={[st.c, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.content, { paddingTop: insets.top + 40 }]}>
        <Avatar
          size={100}
          icon="user"
          bg="rgba(255,255,255,0.18)"
          iconColor="#fff"
        />
        <AppText variant="h3" color="#fff" style={{ marginTop: 16 }}>
          أحمد محمد
        </AppText>
        <AppText variant="bodySM" color="rgba(255,255,255,0.7)">
          مكالمة عائلية
        </AppText>
        <AppText
          variant="h4"
          color="rgba(255,255,255,0.9)"
          style={{ marginTop: 12 }}
        >
          {fmt(duration)}
        </AppText>
      </View>

      <View style={[st.controls, { paddingBottom: insets.bottom + 24 }]}>
        <View style={st.row}>
          <Btn
            icon={muted ? "micOff" : "mic"}
            label={muted ? "رفع الصوت" : "كتم"}
            active={muted}
            onPress={() => setMuted(!muted)}
          />
          <Btn
            icon={speaker ? "mic" : "mic"}
            label="مكبّر"
            active={speaker}
            onPress={() => setSpeaker(!speaker)}
          />
          <Btn
            icon="chat"
            label="رسالة"
            active={false}
            onPress={() => router.push("/family/chat")}
          />
        </View>
        <TouchableOpacity onPress={() => router.back()} style={st.endBtn}>
          <Icon name="call" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Btn({ icon, label, active, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ alignItems: "center", gap: 4 }}
    >
      <View
        style={[st.btn, active && { backgroundColor: "rgba(239,68,68,0.3)" }]}
      >
        <Icon name={icon} size={24} color={active ? "#F0695C" : "#fff"} />
      </View>
      <AppText variant="caption" color="rgba(255,255,255,0.7)">
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  content: { flex: 1, alignItems: "center", gap: 4 },
  controls: { alignItems: "center", gap: 24, paddingTop: 20 },
  row: { flexDirection: "row-reverse", gap: 32 },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F0695C",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
  },
});
