// @ts-nocheck
/**
 * شاشة حالة الحجز الموحدة (Phase 2.2): تدمج booking-confirm + booking-success + booking-pending
 * في مسار واحد بثلاث حالات: confirm (الدفع/التأكيد) → success (نجاح متحرك) → pending (تتبع/إلغاء).
 * منطق التأكيد والدفع محفوظ حرفياً في src/components/BookingConfirmForm.tsx (نُقل دون أي تغيير).
 * التصميم يستهلك brand tokens (الليموني الأساسي) وفق docs/DESIGN_SYSTEM_2026-08-31.md.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, StatusBar, Animated, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { AppText } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { consultationMutationHeaders } from "../../src/utils/consultation-payment";
import { showLocalizedAlert } from "../../src/components/LocalizedAlert";
import { brand } from "../../src/theme/brand";
import { Icon } from "../../src/components/Icon";
import BookingConfirmForm from "../../src/components/BookingConfirmForm";

type Mode = "confirm" | "success" | "pending";

function acceptedRoute(appointment: any, fallbackType: string) {
  const appointmentId = appointment?.id;
  const type = appointment?.service_type || fallbackType;
  if (type === "clinic") return { pathname: "/consultations/clinic-confirm", params: { appointmentId } };
  if (type === "home") return { pathname: "/consultations/home-visit-tracking", params: { appointmentId } };
  return { pathname: "/consultations/virtual-waiting-room", params: { appointmentId } };
}

export default function BookingStatusScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp() as any;
  const AR = lang !== "en";
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId ? String(params.appointmentId) : "";
  const visitType = String(params.visitType || "video");
  const isInsurance = params.isInsurance === "true";
  const isToday = params.isToday !== "false";
  const [mode, setMode] = useState<Mode>(
    params.payment_pending === "true" ? "pending" : appointmentId ? "success" : "confirm"
  );

  /* ── success (من booking-success: نفس الحركة الزنبركية) ── */
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mode !== "success") return;
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
  }, [mode]);

  /* ── pending (من booking-pending: نفس الاستعلام والإلغاء) ── */
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    if (!appointmentId) { setError(AR ? "معرّف الموعد مفقود" : "Missing appointment identifier"); return; }
    setRefreshing(true); setError("");
    try { setAppointment(await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}`)); }
    catch (reason: any) { setError(reason?.message || (AR ? "تعذر تحديث حالة الموعد" : "Unable to refresh appointment status")); }
    finally { setRefreshing(false); }
  }, [AR, appointmentId]);

  useEffect(() => { if (mode === "pending") void refresh(); }, [mode, refresh]);

  const status = appointment?.status || "PENDING";
  const confirmed = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(status);
  const cancelled = ["CANCELLED", "NO_SHOW"].includes(status);

  useEffect(() => {
    if (mode === "pending" && confirmed) router.push(acceptedRoute(appointment, visitType));
  }, [mode, confirmed]);

  const cancel = () => showLocalizedAlert(AR ? "إلغاء الحجز" : "Cancel appointment", AR ? "سيقرر الخادم أهلية الإلغاء والاسترداد من مصدر الدفع الموثق. هل تريد المتابعة؟" : "The server will determine cancellation and any refund from the verified payment source. Continue?", [
    { text: AR ? "رجوع" : "Back", style: "cancel" },
    { text: AR ? "إلغاء الحجز" : "Cancel appointment", style: "destructive", onPress: async () => {
      if (!appointmentId) return;
      setCancelling(true);
      try {
        const updated = await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}/cancel`, { method: "PATCH", headers: consultationMutationHeaders("cancel", appointmentId), body: JSON.stringify({ reason: "patient_cancelled" }) });
        setAppointment(updated || { ...appointment, status: "CANCELLED" });
      } catch (reason: any) {
        showLocalizedAlert(AR ? "تعذر الإلغاء" : "Cancellation failed", reason?.message || (AR ? "حاول مرة أخرى." : "Try again."));
      } finally { setCancelling(false); }
    } },
  ]);

  /* ── الحالة 1: التأكيد والدفع (المنطق الأصلي كما هو) ── */
  if (mode === "confirm") return <BookingConfirmForm />;

  /* ── الحالة 2: نجاح الحجز ── */
  if (mode === "success") return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={[styles.content, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={[styles.badge, { transform: [{ scale: scaleAnim }] }]}>
          <Icon name="check" size={32} color="#fff" />
        </Animated.View>
        <AppText variant="title" style={styles.title}>{AR ? "تم الحجز بنجاح" : "Booking confirmed"}</AppText>
        <AppText style={styles.sub}>
          {isInsurance ? (AR ? "بانتظار موافقة شركة التأمين" : "Awaiting insurance approval") : (AR ? "يمكنك تتبع موعدك والتحضير للاستشارة" : "You can now track and prepare for your visit")}
        </AppText>
        {appointmentId ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: brand.primary.lime }]} onPress={() => setMode("pending")} activeOpacity={0.85}>
            <AppText style={styles.primaryBtnText}>{AR ? "تتبع الموعد" : "Track appointment"}</AppText>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push(!isToday || isInsurance ? "/consultations/appointments" : "/(tabs)/consultations")} activeOpacity={0.8}>
          <AppText style={styles.secondaryBtnText}>{AR ? "مواعيدي" : "My appointments"}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ── الحالة 3: تتبع/انتظار ── */
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <AppText variant="title" style={styles.title}>{AR ? "حالة الموعد" : "Appointment status"}</AppText>
        <View style={[styles.card, { backgroundColor: colors.card || "#fff" }]}>
          <AppText style={styles.sub}>{AR ? "الحالة الحالية" : "Current status"}</AppText>
          <AppText variant="heading" style={{ color: brand.primary.limeDeep, marginTop: 4 }}>{status}</AppText>
          {!!error && <AppText style={{ color: brand.secondary.coral, marginTop: 8 }}>{error}</AppText>}
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: brand.primary.lime, opacity: refreshing ? 0.6 : 1 }]} onPress={refresh} disabled={refreshing} activeOpacity={0.85}>
          <AppText style={styles.primaryBtnText}>{refreshing ? (AR ? "جارٍ التحديث..." : "Refreshing...") : (AR ? "تحديث الحالة" : "Refresh status")}</AppText>
        </TouchableOpacity>
        {!cancelled && !confirmed ? (
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: brand.secondary.coral }]} onPress={cancel} disabled={cancelling} activeOpacity={0.8}>
            <AppText style={[styles.secondaryBtnText, { color: brand.secondary.coral }]}>{cancelling ? (AR ? "جارٍ الإلغاء..." : "Cancelling...") : (AR ? "إلغاء الحجز" : "Cancel appointment")}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", gap: 14 },
  badge: { width: 104, height: 104, borderRadius: 52, backgroundColor: brand.primary.lime, alignItems: "center", justifyContent: "center", shadowColor: brand.primary.limeDeep, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  badgeMark: { fontSize: 52, color: "#16213A", fontWeight: "800" },
  title: { textAlign: "center", marginTop: 6 },
  sub: { textAlign: "center", opacity: 0.7 },
  card: { alignSelf: "stretch", borderRadius: brand.radius.lg, padding: 18, alignItems: "center" },
  primaryBtn: { alignSelf: "stretch", borderRadius: brand.radius.lg, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#16213A", fontWeight: "800", fontSize: 16 },
  secondaryBtn: { alignSelf: "stretch", borderRadius: brand.radius.lg, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(0,0,0,0.12)" },
  secondaryBtnText: { fontWeight: "700" },
});
