// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
} from "react-native";
import { useApp } from "../../src/context/AppContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../src/utils/api";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Polyline,
  Polygon,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

// Premium Icons
const Icons = {
  MapPin: ({ color }: { color: string }) => (
    <Svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={color}
      stroke="#fff"
      strokeWidth="1.5"
    >
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx="12" cy="10" r="3" fill="#fff" />
    </Svg>
  ),
  Phone: () => (
    <Svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  ),
  Nav: () => (
    <Svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
    >
      <Polygon points="3 11 22 2 13 21 11 13 3 11" />
    </Svg>
  ),
};

export default function NursingLiveTracking() {
  const router = useRouter();
  const { colors, isDark } = useApp();
  const { type, bookingId } = useLocalSearchParams(); // 'nurse' or 'patient'

  const [eta, setEta] = useState<number | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const fetchTracking = async () => {
      try {
        const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);
        setTrackingData(res);
        setEta(Number.isFinite(Number(res?.eta_minutes)) ? Number(res.eta_minutes) : null);
        setTrackingError(null);
      } catch (error: any) {
        setTrackingData(null);
        setEta(null);
        setTrackingError(error?.message || 'تعذر تحميل التتبع الحي للزيارة.');
      }
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const isNurseComing = type === "nurse";

  if (trackingData?.status === 'COMPLETED') {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Path d="M22 4L12 14.01l-3-3"/></Svg>
          </View>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 24, color: '#1E293B', marginBottom: 12 }}>اكتملت الزيارة بنجاح</Text>
          <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32 }}>تم رفع التقرير الطبي للزيارة. يمكنك الآن تقييم الممرض والاطلاع على السجل الطبي.</Text>
          
          <View style={{ width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
            <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#1E293B', marginBottom: 16, textAlign: 'right' }}>التقرير السريري للزيارة</Text>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>النبض (BPM):</Text>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.pulse ?? 'غير مسجل'}</Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ضغط الدم:</Text>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.bp ?? 'غير مسجل'}</Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ملاحظات الممرض:</Text>
              <Text style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#1E293B', flex: 1, textAlign: 'left' }}>{trackingData.notes ?? 'لا توجد ملاحظات مسجلة.'}</Text>
            </View>
          </View>

          <TouchableOpacity style={{ backgroundColor: '#23B5CE', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 }} onPress={() => router.push('/(tabs)')}>
            <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' }}>تقييم الزيارة والعودة للرئيسية</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC' }]}>
        <Icons.MapPin color="#23B5CE" />
        <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#1E293B', marginTop: 12, textAlign: 'center' }}>خريطة الموقع الحي</Text>
        <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
          {trackingError || (trackingData?.location ? 'تم استلام موقع الزيارة. يتطلب العرض الجغرافي مزود خرائط مهيأ.' : 'لم يستلم النظام موقعاً حياً لهذه الزيارة بعد.')}
        </Text>
      </View>

      {/* HEADER */}
      <BlurView intensity={90} tint="light" style={styles.glassHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(tabs)")}
        >
          <Svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1E293B"
            strokeWidth="2.5"
          >
            <Path d="M9 18l6-6-6-6" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNurseComing ? "تتبع الممرض" : "التوجه للمستشفى"}
        </Text>
      </BlurView>

      {/* TRACKING CARD (BOTTOM) */}
      <View style={styles.bottomSheet}>
        <BlurView intensity={90} tint="light" style={styles.sheetContent}>
          <View style={styles.handle} />

          {/* ETA ROW */}
          <View style={styles.etaRow}>
            <View style={styles.etaCircle}>
              <Text style={styles.etaNum}>{eta ?? '—'}</Text>
              <Text style={styles.etaMin}>{eta === null ? 'غير متاح' : 'دقيقة'}</Text>
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.statusTitle}>
                {isNurseComing
                  ? "الممرض في الطريق إليك"
                  : "يرجى التوجه لإحضار الممرض"}
              </Text>
              <Text style={styles.statusDesc}>
                {isNurseComing
                  ? `مقدم الخدمة: ${trackingData?.nurse_name ?? 'غير متاح'}.`
                  : `الوجهة: ${trackingData?.facility_name ?? 'غير متاحة'}.`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* NURSE / FACILITY INFO */}
          <View style={styles.infoRow}>
            <View style={styles.avatarBox}>
              <Svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="#FDECEB"
                stroke="#F0695C"
                strokeWidth="1"
              >
                <Circle cx="12" cy="7" r="4" />
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </Svg>
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.infoName}>{trackingData?.nurse_name ?? 'مقدم الخدمة غير متاح'}</Text>
              <Text style={styles.infoSub}>{trackingData?.nurse_title ?? trackingData?.facility_name ?? 'لا توجد بيانات مهنية مؤكدة'}</Text>
            </View>

            {isNurseComing ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => {
                  if (trackingData?.nurse_phone) {
                    Linking.openURL(`tel:${trackingData.nurse_phone}`);
                  }
                }}
              >
                <Icons.Phone />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: "#10B981" }]}
                onPress={() => {
                  if (
                    trackingData?.hospital_lat &&
                    trackingData?.hospital_lng
                  ) {
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${trackingData.hospital_lat},${trackingData.hospital_lng}`,
                    );
                  }
                }}
              >
                <Icons.Nav />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  mapBg: { ...StyleSheet.absoluteFillObject },
  pinLabel: {
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pinText: { fontFamily: "Cairo-Bold", fontSize: 11, color: "#1E293B" },

  glassHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.7)",
  },
  backBtn: { position: "absolute", right: 20, top: 60, padding: 8 },
  headerTitle: { fontFamily: "Cairo-Bold", fontSize: 18, color: "#1E293B" },

  bottomSheet: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
  sheetContent: { padding: 24, backgroundColor: "rgba(255,255,255,0.75)" },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#CBD5E1",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },

  etaRow: { flexDirection: "row-reverse", alignItems: "center" },
  etaCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#23B5CE",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#23B5CE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  etaNum: {
    fontFamily: "Cairo-Bold",
    fontSize: 24,
    color: "#fff",
    lineHeight: 28,
  },
  etaMin: { fontFamily: "Cairo-Medium", fontSize: 12, color: "#fff" },
  statusTitle: {
    fontFamily: "Cairo-Bold",
    fontSize: 17,
    color: "#1E293B",
    textAlign: "right",
    marginBottom: 4,
  },
  statusDesc: {
    fontFamily: "Cairo-Medium",
    fontSize: 13,
    color: "#64748B",
    textAlign: "right",
    lineHeight: 20,
  },

  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 20 },

  infoRow: { flexDirection: "row-reverse", alignItems: "center" },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoName: {
    fontFamily: "Cairo-Bold",
    fontSize: 16,
    color: "#1E293B",
    textAlign: "right",
  },
  infoSub: {
    fontFamily: "Cairo-Medium",
    fontSize: 13,
    color: "#64748B",
    textAlign: "right",
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
