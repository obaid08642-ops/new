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
import MapView, { Marker, PROVIDER_DEFAULT } from "../../src/components/MapPrimitives";
import { LocalizedText } from '../../src/components/LocalizedText';
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

  useEffect(() => {
    if (!bookingId) return;
    let stopped = false;
    const fetchTracking = async () => {
      try {
        const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);
        if (stopped) return;
        setTrackingData(res);
        if (res?.eta_minutes != null) setEta(res.eta_minutes);
      } catch { /* keep last known state; next poll retries */ }
    };
    fetchTracking();
    // E2: poll the live API every 15s (was: fetch once + a fake local ETA countdown)
    const interval = setInterval(fetchTracking, 15000);
    return () => { stopped = true; clearInterval(interval); };
  }, [bookingId]);

  const isNurseComing = type === "nurse";

  if (trackingData?.status === 'COMPLETED') {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Path d="M22 4L12 14.01l-3-3"/></Svg>
          </View>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 24, color: '#1E293B', marginBottom: 12 }}>اكتملت الزيارة بنجاح</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32 }}>تم رفع التقرير الطبي للزيارة. يمكنك الآن تقييم الممرض والاطلاع على السجل الطبي.</LocalizedText>

          <View style={{ width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#1E293B', marginBottom: 16, textAlign: 'right' }}>التقرير السريري للزيارة</LocalizedText>
            {trackingData.vitals || trackingData.notes ? (
              <>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>النبض (BPM):</LocalizedText>
                  <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.pulse ?? '—'}</LocalizedText>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ضغط الدم:</LocalizedText>
                  <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B' }}>{trackingData.vitals?.bp ?? '—'}</LocalizedText>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 }}>
                  <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B' }}>ملاحظات الممرض:</LocalizedText>
                  <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#1E293B', flex: 1, textAlign: 'left' }}>{trackingData.notes ?? '—'}</LocalizedText>
                </View>
              </>
            ) : (
              <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B', textAlign: 'right' }}>لم يُرفق الممرض تقريرًا سريريًا لهذه الزيارة.</LocalizedText>
            )}
          </View>

          <TouchableOpacity style={{ backgroundColor: '#23B5CE', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 }} onPress={() => router.push('/(tabs)')}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' }}>تقييم الزيارة والعودة للرئيسية</LocalizedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* REAL MAP — nurse GPS + destination from the live tracking API */}
      <View style={styles.mapBg}>
        {trackingData?.current_lat != null && trackingData?.current_lng != null ? (
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            region={{
              latitude: trackingData.current_lat,
              longitude: trackingData.current_lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker
              coordinate={{ latitude: trackingData.current_lat, longitude: trackingData.current_lng }}
              title={isNurseComing ? 'الممرض' : 'المسعف'}
              pinColor="#3b82f6"
            />
            {trackingData?.hospital_lat != null && trackingData?.hospital_lng != null && (
              <Marker
                coordinate={{ latitude: trackingData.hospital_lat, longitude: trackingData.hospital_lng }}
                title={isNurseComing ? 'منزلك (الوجهة)' : 'المستشفى (الوجهة)'}
                pinColor="#EF4444"
              />
            )}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9' }]}>
            <Icons.MapPin color="#94A3B8" />
            <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 32 }}>
              {trackingData ? 'لم يبدأ مشاركة الموقع الحي بعد — سيظهر المسار هنا فور انطلاقه' : 'جاري تحميل بيانات التتبع...'}
            </LocalizedText>
          </View>
        )}
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
        <LocalizedText style={styles.headerTitle}>
          {isNurseComing ? "تتبع الممرض" : "التوجه للمستشفى"}
        </LocalizedText>
      </BlurView>

      {/* TRACKING CARD (BOTTOM) */}
      <View style={styles.bottomSheet}>
        <BlurView intensity={90} tint="light" style={styles.sheetContent}>
          <View style={styles.handle} />

          {/* ETA ROW */}
          <View style={styles.etaRow}>
            <View style={styles.etaCircle}>
              <LocalizedText style={styles.etaNum}>{eta != null ? eta : '—'}</LocalizedText>
              <LocalizedText style={styles.etaMin}>{eta != null ? 'دقيقة' : 'تقدير غير متاح'}</LocalizedText>
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <LocalizedText style={styles.statusTitle}>
                {isNurseComing
                  ? "الممرض في الطريق إليك"
                  : "يرجى التوجه لإحضار الممرض"}
              </LocalizedText>
              <LocalizedText style={styles.statusDesc}>
                {isNurseComing
                  ? `سيصل ${trackingData?.nurse_name || 'الممرض'} إلى موقعك قريباً.`
                  : 'يرجى التوجه إلى نقطة الاستلام الموضحة على الخريطة.'}
              </LocalizedText>
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
              <LocalizedText style={styles.infoName}>{trackingData?.nurse_name || 'طاقم التمريض'}</LocalizedText>
              <LocalizedText style={styles.infoSub}>{trackingData?.nurse_title || 'تمريض منزلي معتمد'}</LocalizedText>
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
