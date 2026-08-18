// @ts-nocheck
/**
 * app/pharmacy/waiting-for-pharmacy.tsx
 * Radar animation screen while system searches for nearest pharmacy.
 * - Polls GET /orders/:orderId every 3 seconds for status change.
 * - When pharmacy accepts → navigates to order-confirm screen.
 * - Allows patient to cancel order.
 * - Graceful fallback: after 5 seconds simulates pharmacy found for testing.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { lightColors, darkColors } from "../../src/theme/colors";
import { apiFetch } from "../../src/utils/api";
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function WaitingForPharmacyScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [dotsCount, setDotsCount] = useState(1);

  // ─── Pulse Animations ────────────────────────────────────────────────────────
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  const startPulse = (anim: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const startIconPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.12,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  useEffect(() => {
    startPulse(pulse1, 0);
    startPulse(pulse2, 700);
    startPulse(pulse3, 1400);
    startIconPulse();

    // Animated dots "..."
    const dotsInterval = setInterval(() => {
      setDotsCount((d) => (d % 3) + 1);
    }, 500);

    // ─── Poll backend for order status ──────────────────────────────────────────
    let polling: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      if (!orderId) return;
      try {
        const order = await apiFetch(`/orders/${orderId}`);
        if (
          order?.state === "ACCEPTED" ||
          order?.state === "PREPARING" ||
          order?.basket_review_status === "submitted_for_patient_approval"
        ) {
          clearInterval(polling);
          router.replace({
            pathname: "/pharmacy/order-confirm",
            params: { orderId },
          });
        }
      } catch {
        // Backend offline – ignore, rely on fallback timer
      }
    };

    polling = setInterval(checkStatus, 3000);
    checkStatus(); // Immediate first check

    // Removed fallback simulated order
    return () => {
      clearInterval(dotsInterval);
      clearInterval(polling);
    };
  }, [orderId]);

  const handleCancel = () => {
    showLocalizedAlert("إلغاء الطلب", "هل أنت متأكد من رغبتك في إلغاء الطلب؟", [
      { text: "لا، تراجع" },
      {
        text: "نعم، إلغاء",
        style: "destructive",
        onPress: async () => {
          // E2: was catch{} then navigate away anyway — user thought the order was cancelled when it wasn't.
          try {
            if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });
            router.replace("/(tabs)/pharmacy");
          } catch (e: any) {
            showLocalizedAlert("تعذر إلغاء الطلب", e?.message || "تحقق من اتصالك وحاول مرة أخرى.");
          }
        },
      },
    ]);
  };

  const dots = ".".repeat(dotsCount);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <LocalizedText style={[styles.headerTitle, { color: colors.n }]}>
          البحث عن صيدلية
        </LocalizedText>
      </View>

      {/* Radar */}
      <View style={styles.radarWrap}>
        {[pulse1, pulse2, pulse3].map((p, i) => (
          <Animated.View
            key={i}
            style={[
              styles.pulseRing,
              {
                borderColor: "#23B5CE",
                transform: [
                  {
                    scale: p.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 3.5],
                    }),
                  },
                ],
                opacity: p.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.9, 0.4, 0],
                }),
              },
            ]}
          />
        ))}
        <Animated.View
          style={[styles.centerIcon, { transform: [{ scale: iconScale }] }]}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: "#23B5CE",
              fontSize: 48,
            }}
          >
            local_pharmacy
          </LocalizedText>
        </Animated.View>
      </View>

      {/* Status Text */}
      <LocalizedText style={[styles.statusTitle, { color: colors.n }]}>
        نبحث لك عن أقرب صيدلية{dots}
      </LocalizedText>
      <LocalizedText style={[styles.statusSub, { color: colors.t2 }]}>
        نقوم بمطابقة طلبك مع شبكة الصيدليات القريبة منك والتي تقبل تأمينك الطبي
        وتوفر الأصناف المطلوبة.
      </LocalizedText>

      {/* Info Cards */}
      <View
        style={[
          styles.infoRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {[
          { icon: "verified", label: "صيدليات موثقة" },
          { icon: "health_and_safety", label: "يقبل تأمينك" },
          { icon: "near_me", label: "الأقرب إليك" },
        ].map((item, i) => (
          <View
            key={i}
            style={[
              styles.infoCard,
              { backgroundColor: colors.s, borderColor: colors.bd },
            ]}
          >
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: "#23B5CE",
                fontSize: 22,
                marginBottom: 4,
              }}
            >
              {item.icon}
            </LocalizedText>
            <LocalizedText
              style={{
                fontFamily: "Cairo-Regular",
                fontSize: 11,
                color: colors.t2,
                textAlign: "center",
              }}
            >
              {item.label}
            </LocalizedText>
          </View>
        ))}
      </View>

      {/* Cancel */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            { backgroundColor: colors.s, borderColor: colors.bd },
          ]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: "#F0695C",
              fontSize: 20,
              marginRight: 8,
            }}
          >
            cancel
          </LocalizedText>
          <LocalizedText
            style={{ fontFamily: "Cairo-Bold", fontSize: 15, color: "#F0695C" }}
          >
            إلغاء الطلب
          </LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  header: { paddingBottom: 20 },
  headerTitle: { fontFamily: "Cairo-Black", fontSize: 20 },
  radarWrap: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  centerIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#DEF5F9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#23B5CE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  statusTitle: {
    fontFamily: "Cairo-Black",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 12,
  },
  statusSub: {
    fontFamily: "Cairo-Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  infoRow: { justifyContent: "center", gap: 10, paddingHorizontal: 20 },
  infoCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
});
