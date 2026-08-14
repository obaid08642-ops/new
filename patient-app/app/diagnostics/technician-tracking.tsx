// @ts-nocheck
import { Linking } from "react-native";
import React, { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
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
import { useLocalSearchParams } from "expo-router";
import { apiFetch } from "../../src/utils/api";

export default function TechnicianTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState<any>(null);

  const [eta, setEta] = useState(8);
  const [status, setStatus] = useState<"on_way" | "arrived" | "collecting">(
    "on_way",
  );

  useEffect(() => {
    if (bookingId) {
      apiFetch(`/labs/bookings/${bookingId}`)
        .then(res => setBooking(res?.data || res))
        .catch(console.error);
    }
  }, [bookingId]);

  useEffect(() => {
    if (status !== "on_way") return;
    const t = setInterval(() => {
      setEta((p) => {
        if (p <= 1) {
          setStatus("arrived");
          return 0;
        }
        return p - 1;
      });
    }, 30000);
    return () => clearInterval(t);
  }, [status]);

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            تتبع فني المختبر
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
        <View style={st.etaCard}>
          <Icon
            name={status === "arrived" ? "check-circle" : "navigate"}
            size={32}
            color="#fff"
          />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h3" color="#fff">
              {status === "on_way"
                ? `${eta} دقيقة`
                : status === "arrived"
                  ? "وصل الفني!"
                  : "جاري سحب العينة"}
            </AppText>
            <AppText variant="bodySM" color="rgba(255,255,255,0.85)">
              {status === "on_way" ? "الفني في الطريق إليك" : "الفني عندك"}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        <Card
          style={{
            height: 180,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surfaceSecondary,
          }}
        >
          <Icon name="map" size={48} color="#7A6BEA" />
          <AppText variant="bodySM" color={colors.textTertiary}>
            خريطة تتبع مباشر
          </AppText>
        </Card>

        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={[st.docAva, { backgroundColor: "#7A6BEA18" }]}>
            <Icon name="science" size={24} color="#7A6BEA" />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">أحمد محمد — فني مختبر</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مختبرات البرج — خبرة 5 سنوات
            </AppText>
          </View>
          <Badge
            label={status === "on_way" ? "في الطريق" : "وصل"}
            color={status === "on_way" ? colors.warning : colors.success}
          />
        </Card>

        <Card>
          <AppText variant="h6" style={{ marginBottom: 8 }}>
            التحاليل المطلوبة
          </AppText>
          {(booking?.items?.map((i: any) => i.name_ar || i.name_en) || ["تحاليل مخبرية"]).map((t: string, i: number) => (
            <View
              key={i}
              style={{
                flexDirection: "row-reverse",
                gap: 6,
                paddingVertical: 4,
                alignItems: "center",
              }}
            >
              <Icon name="science" size={14} color="#7A6BEA" />
              <AppText variant="bodySM" color={colors.textSecondary}>
                {t}
              </AppText>
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <Button
            label="اتصل بالفني"
            variant="outline"
            icon="call"
            onPress={() => Linking.openURL("tel:920000000")}
            full={false}
            style={{ flex: 1 }}
          />
          <Button
            label="رسالة"
            variant="outline"
            icon="chat"
            onPress={() => Linking.openURL("tel:920000000")}
            full={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  etaCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 16,
  },
  docAva: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
