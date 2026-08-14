// @ts-nocheck
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText } from "../../src/components/ui";
import { resolveColor, darkColors, lightColors } from "../../src/theme/colors";

export default function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const params = useLocalSearchParams<{
    visitType?: string;
    isInsurance?: string;
    isToday?: string;
  }>();
  const visitType = params.visitType || "video";
  const isInsurance = params.isInsurance === "true";
  const isToday = params.isToday !== "false";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNext = () => {
    if (isInsurance) {
      router.push("/(tabs)/consultations");
      return;
    }
    if (!isToday) {
      router.push("/consultations/appointments");
      return;
    }
    switch (visitType) {
      case "clinic":
        router.push("/consultations/clinic-location");
        break;
      case "home":
        router.push("/consultations/home-visit-tracking");
        break;
      case "video":
      default:
        router.push({
          pathname: "/consultations/virtual-waiting-room",
          params: { appointmentId: "APT001" },
        });
        break;
    }
  };

  const nextLabel = isInsurance
    ? lang === "ar"
      ? "تتبع حالة الموافقة"
      : "Track Approval Status"
    : !isToday
      ? lang === "ar"
        ? "عرض مواعيدي"
        : "My Appointments"
      : visitType === "clinic"
        ? lang === "ar"
          ? "عرض موقع العيادة والاتجاهات"
          : "View Clinic Location"
        : visitType === "home"
          ? lang === "ar"
            ? "تتبع الطبيب على الخريطة"
            : "Track Doctor on Map"
          : lang === "ar"
            ? "الدخول لغرفة الانتظار"
            : "Enter Waiting Room";

  const nextIcon = isInsurance
    ? "hourglass-empty"
    : !isToday
      ? "event"
      : visitType === "clinic"
        ? "near_me"
        : visitType === "home"
          ? "map"
          : "videocam";

  const statusTitle = isInsurance
    ? lang === "ar"
      ? "تم استلام الطلب"
      : "Request Received"
    : lang === "ar"
      ? "تم الحجز بنجاح!"
      : "Booking Confirmed!";

  const statusSubtitle = isInsurance
    ? lang === "ar"
      ? "في انتظار الموافقة الطبية لمعرفة نسبة التحمل (Copay)"
      : "Waiting for medical approval to get Copay amount"
    : lang === "ar"
      ? "موعدك مؤكد مع الطبيب"
      : "Your appointment is confirmed with the doctor";

  const statusColor = isInsurance
    ? resolveColor("var(--w)")
    : resolveColor("var(--s)");
  const statusIcon = isInsurance ? "schedule" : "check_circle";

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.body,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: resolveColor("var(--p)"),
            },
          ]}
        >
          <AppText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              fontSize: 64,
              color: "#fff",
            }}
          >
            {statusIcon}
          </AppText>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
          <AppText variant="h2" color={colors.n} align="center">
            {statusTitle}
          </AppText>
          <AppText
            variant="bodyMD"
            color={colors.t2}
            align="center"
            style={{ marginTop: 12 }}
          >
            {statusSubtitle}
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? resolveColor("var(--cs)") : "#fff",
                borderColor: colors.bd,
              },
            ]}
          >
            <View
              style={[
                styles.row,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: resolveColor("var(--ps)") },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: "MaterialSymbolsRounded",
                    color: resolveColor("var(--p)"),
                    fontSize: 24,
                  }}
                >
                  calendar_month
                </AppText>
              </View>
              <View
                style={[
                  styles.rowText,
                  { alignItems: isRTL ? "flex-end" : "flex-start" },
                ]}
              >
                <AppText variant="caption" color={colors.t3}>
                  {lang === "ar" ? "التاريخ والوقت" : "Date & Time"}
                </AppText>
                <AppText variant="bodySM" color={colors.n}>
                  الثلاثاء، 24 مايو — 10:30 صباحاً
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <View
              style={[
                styles.row,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: resolveColor("var(--ps)") },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: "MaterialSymbolsRounded",
                    color: resolveColor("var(--p)"),
                    fontSize: 24,
                  }}
                >
                  person
                </AppText>
              </View>
              <View
                style={[
                  styles.rowText,
                  { alignItems: isRTL ? "flex-end" : "flex-start" },
                ]}
              >
                <AppText variant="caption" color={colors.t3}>
                  {lang === "ar" ? "الطبيب" : "Doctor"}
                </AppText>
                <AppText variant="bodySM" color={colors.n}>
                  د. محمد أحمد الكردي
                </AppText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.btn,
              styles.primaryBtn,
              { backgroundColor: resolveColor("var(--p)") },
            ]}
            onPress={handleNext}
          >
            <AppText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: "#fff",
                fontSize: 20,
                marginRight: isRTL ? 0 : 8,
                marginLeft: isRTL ? 8 : 0,
              }}
            >
              {nextIcon}
            </AppText>
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {nextLabel}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.secondaryBtn,
              { borderColor: colors.bd },
            ]}
            onPress={() => router.push("/(tabs)")}
          >
            <AppText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: colors.n,
                fontSize: 24,
              }}
            >
              home
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, alignItems: "center" },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "var(--p)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textBlock: { width: "100%", alignItems: "center" },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: { alignItems: "center", marginVertical: 8 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, marginHorizontal: 16 },
  divider: {
    height: 1,
    backgroundColor: "var(--bd)",
    opacity: 0.1,
    marginVertical: 8,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: "center",
    gap: 12,
  },
  btn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryBtn: { flex: 1 },
  secondaryBtn: { width: 56, borderWidth: 1 },
});
