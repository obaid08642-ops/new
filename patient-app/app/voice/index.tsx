// @ts-nocheck
// app/voice/index.tsx
// ️ المساعد الصوتي — احجز وأطلب بصوتك
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";

const COMMANDS = [
  {
    icon: "calendar",
    text: "احجز موعد مع طبيب قلب",
    action: "book_doctor",
    category: "استشارة",
  },
  {
    icon: "medication",
    text: "اطلب بنادول من الصيدلية",
    action: "order_medicine",
    category: "صيدلية",
  },
  {
    icon: "science",
    text: "احجز تحليل صورة دم",
    action: "book_lab",
    category: "تحاليل",
  },
  {
    icon: "emergency",
    text: "اتصل بالإسعاف",
    action: "emergency",
    category: "طوارئ",
  },
  {
    icon: "medication",
    text: "احجز ممرض منزلي",
    action: "book_nurse",
    category: "تمريض",
  },
  {
    icon: "document",
    text: "ما هي مواعيدي اليوم؟",
    action: "show_appointments",
    category: "مواعيد",
  },
];

const SUGGESTIONS = [
  "احجز موعد مع طبيب قلب غداً",
  "اطلب أدويتي المعتادة",
  "كم نقطة نبض لدي؟",
  "أقرب صيدلية مفتوحة",
  "تذكير دوائي القادم",
];

const RESPONSES: Record<string, string> = {
  book_doctor:
    "جاري البحث عن أطباء القلب المتاحين... وجدت 3 مواعيد متاحة غداً!",
  order_medicine: "تم إضافة بنادول إلى سلة الصيدلية. هل تريد إتمام الطلب؟",
  book_lab: "وجدت موعداً لتحليل صورة الدم غداً الساعة 8 صباحاً في مختبر الدقة.",
  emergency: " جاري الاتصال بالإسعاف 997 الآن...",
  book_nurse: "وجدت ممرضاً متاحاً اليوم بعد الظهر. هل تريد تأكيد الحجز؟",
  show_appointments:
    "لديك موعدان اليوم:\n• 2:00 م — د. أحمد السيد (قلب)\n• 5:30 م — تحليل سكر",
};

type VoiceState = "idle" | "listening" | "processing" | "responded";

export default function VoiceAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState<Array<{ user: string; ai: string }>>(
    [],
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.5)).current;
  const wave3 = useRef(new Animated.Value(0.7)).current;
  const wave4 = useRef(new Animated.Value(0.4)).current;
  const wave5 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (state === "listening") {
      // Pulse mic button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
      // Wave bars animation
      const animateWave = (anim: Animated.Value, duration: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration,
              useNativeDriver: false,
            }),
          ]),
        ).start();
      animateWave(wave1, 400);
      animateWave(wave2, 300);
      animateWave(wave3, 500);
      animateWave(wave4, 350);
      animateWave(wave5, 450);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [state]);

  const handlePress = () => {
    if (state === "idle" || state === "responded") {
      setState("listening");
      setTranscript("");
      setResponse("");
      // Simulate voice recognition after 2.5s
      setTimeout(() => {
        const cmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
        setTranscript(cmd.text);
        setState("processing");
        setTimeout(() => {
          const resp = RESPONSES[cmd.action] || "تم تنفيذ الأمر بنجاح!";
          setResponse(resp);
          setState("responded");
          setHistory((h) => [...h, { user: cmd.text, ai: resp }].slice(-5));
          // Auto-navigate for some actions
          if (cmd.action === "emergency") {
            setTimeout(() => router.push("/emergency/sos"), 1500);
          }
        }, 1200);
      }, 2500);
    } else if (state === "listening") {
      setState("idle");
    }
  };

  const useSuggestion = (text: string) => {
    setState("processing");
    setTranscript(text);
    setTimeout(() => {
      setResponse("جاري التنفيذ...");
      setState("responded");
    }, 1000);
  };

  const waveHeight = (anim: Animated.Value) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 40],
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFillObject} />
      {/* Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
          <Icon name="back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText variant="bodySM">المساعد الصوتي ️</AppText>
        <TouchableOpacity style={styles.hBtn}>
          <Icon name="settings" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Conversation history */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            {history.slice(-3).map((item, i) => (
              <View key={i} style={styles.historyItem}>
                <View
                  style={[
                    styles.aiBubble,
                    { backgroundColor: "rgba(0,102,204,0.25)" },
                  ]}
                >
                  <AppText variant="bodySM">{item.ai}</AppText>
                </View>
                <View
                  style={[
                    styles.userBubble,
                    { backgroundColor: "rgba(255,255,255,0.12)" },
                  ]}
                >
                  <AppText variant="bodySM">️ {item.user}</AppText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Main mic area */}
        <View style={styles.micArea}>
          {/* Wave visualization */}
          {state === "listening" && (
            <View style={styles.waveContainer}>
              {[wave1, wave2, wave3, wave4, wave5].map((w, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: waveHeight(w),
                      backgroundColor:
                        i === 2 ? "#23B5CE" : "rgba(255,255,255,0.5)",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Status text */}
          <AppText variant="bodySM">
            {state === "idle" && "اضغط للتحدث"}
            {state === "listening" && "أنا أستمع..."}
            {state === "processing" && "جاري المعالجة..."}
            {state === "responded" && ""}
          </AppText>

          {/* Transcript */}
          {transcript && (
            <View
              style={[
                styles.transcriptBox,
                { backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <AppText variant="bodySM">️ {transcript}</AppText>
            </View>
          )}

          {/* Response */}
          {response && (
            <View
              style={[
                styles.responseBox,
                {
                  backgroundColor: "rgba(0,102,204,0.3)",
                  borderColor: "#23B5CE50",
                },
              ]}
            >
              <AppText variant="bodySM">{response}</AppText>
              {state === "responded" && (
                <View style={styles.responseActions}>
                  <TouchableOpacity
                    style={[styles.responseBtn, { backgroundColor: "#23B5CE" }]}
                  >
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="check" size={16} color={colors.primary} />
                      <AppText variant="bodySM">تأكيد</AppText>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.responseBtn,
                      { backgroundColor: "rgba(255,255,255,0.15)" },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="close" size={16} color={colors.primary} />
                      <AppText variant="bodySM">إلغاء</AppText>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Mic Button */}
          <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
            <Animated.View
              style={[
                styles.micButton,
                { transform: [{ scale: pulseAnim }] },
                state === "listening" && { backgroundColor: "#F0695C" },
              ]}
            >
              {state === "listening" ? (
                <View style={styles.stopSquare} />
              ) : state === "processing" ? (
                <Icon name="refresh" size={32} color="#fff" />
              ) : (
                <Icon name="mic" size={36} color="#fff" />
              )}
            </Animated.View>
          </TouchableOpacity>

          {state === "idle" && (
            <AppText variant="bodySM">أو اختر من الاقتراحات أدناه</AppText>
          )}
        </View>

        {/* Quick commands */}
        <View style={styles.commandsSection}>
          <AppText variant="bodySM">اقتراحات سريعة</AppText>
          <View style={styles.commandsGrid}>
            {COMMANDS.map((cmd, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => useSuggestion(cmd.text)}
                style={[
                  styles.commandChip,
                  {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "rgba(255,255,255,0.2)",
                  },
                ]}
              >
                <AppText variant="bodySM">{cmd.icon}</AppText>
                <View>
                  <AppText variant="bodySM">{cmd.text}</AppText>
                  <AppText variant="bodySM">{cmd.category}</AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0,102,204,0.08)",
    top: -80,
    right: -80,
  },
  orb2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,201,167,0.06)",
    bottom: 100,
    left: -60,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  historySection: { paddingHorizontal: 20, paddingTop: 10, gap: 8 },
  historyItem: { gap: 6 },
  userBubble: {
    alignSelf: "flex-end",
    borderRadius: 14,
    padding: 10,
    maxWidth: "85%",
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderRadius: 14,
    padding: 10,
    maxWidth: "90%",
  },
  bubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 18,
  },
  micArea: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 16,
    paddingHorizontal: 24,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 50,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  statusText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    fontWeight: "700",
  },
  transcriptBox: { borderRadius: 16, padding: 14, width: "100%" },
  transcriptText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 22,
  },
  responseBox: { borderRadius: 16, padding: 14, width: "100%", borderWidth: 1 },
  responseText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 20,
  },
  responseActions: { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  responseBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  responseBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#23B5CE",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#23B5CE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: undefined,
  },
  micHint: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "400" },
  commandsSection: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  commandsTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  commandsGrid: { gap: 8 },
  commandChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  commandIcon: { fontSize: 24 },
  commandText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  commandCat: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "400",
    textAlign: "right",
  },
});
