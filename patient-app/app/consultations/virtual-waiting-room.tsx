// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { resolveColor, darkColors, lightColors } from "../../src/theme/colors";
import { apiFetch } from "../../src/utils/api";

export default function VirtualWaitingRoomScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    if (appointmentId) {
      apiFetch(`/care/appointments/${appointmentId}`)
        .then((res: any) => {
          setData(res?.data || res);
          setLoading(false);
        })
        .catch(() => {
          setData(null);
          setLoading(false);
        });
    } else {
      setData(null);
      setLoading(false);
    }
  }, [appointmentId]);

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );

  if (!data)
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", fontSize: 18 }}>
          {isRTL ? "الموعد غير موجود" : "Appointment Not Found"}
        </Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#222A3D' }]} />

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text
          style={{
            fontFamily: "MaterialSymbolsRounded",
            color: "#fff",
            fontSize: 22,
          }}
        >
          close
        </Text>
      </TouchableOpacity>

      <View
        style={{
          position: "relative",
          width: 130,
          height: 130,
          marginBottom: 24,
        }}
      >
        <Animated.View
          style={[
            styles.pulseRing,
            {
              backgroundColor: resolveColor("var(--p)"),
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            },
          ]}
        />
        <View
          style={[styles.avatarBox, { borderColor: resolveColor("var(--p)") }]}
        >
          <View
            style={[
              styles.avatarInner,
              { backgroundColor: resolveColor("var(--ps)") },
            ]}
          >
            <Text
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: resolveColor("var(--p)"),
                fontSize: 50,
              }}
            >
              person
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={{
          fontSize: 20,
          fontWeight: "900",
          color: "#fff",
          marginBottom: 6,
        }}
      >
        {data?.doctor_name}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,.6)",
          marginBottom: 28,
        }}
      >
        استشارة {data?.specialty_ar || data?.specialty} عبر الفيديو
      </Text>

      <View style={styles.waitBox}>
        <Text
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.6)",
            marginBottom: 6,
          }}
        >
          دورك بعد
        </Text>
        <Text style={{ fontSize: 40, fontWeight: "900", color: "#fff" }}>
          {data?.wait_time ? `٠${data.wait_time}:٠٠` : '٠٢:٣٠'}
        </Text>
        <Text
          style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginTop: 6 }}
        >
          أنت التالي في القائمة
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.joinBtn, { backgroundColor: resolveColor("var(--p)") }]}
        onPress={() =>
          router.push({
            pathname: "/consultations/video-call",
            params: { appointmentId },
          })
        }
      >
        <Text
          style={{
            fontFamily: "MaterialSymbolsRounded",
            fontSize: 20,
            color: "#fff",
            marginRight: 8,
          }}
        >
          videocam
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>
          دخول المكالمة
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#222A3D",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 65,
  },
  avatarBox: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 51,
    borderWidth: 3,
    overflow: "hidden",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  waitBox: {
    backgroundColor: "rgba(255,255,255,.1)",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 30,
    marginBottom: 24,
    alignItems: "center",
  },
  joinBtn: {
    width: "100%",
    maxWidth: 300,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
