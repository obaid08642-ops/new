// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { resolveColor, darkColors, lightColors } from "../../src/theme/colors";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function WaitingRoomScreen() {
  const { appointmentId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.bg, justifyContent: "center" },
        ]}
      >
        <ActivityIndicator color={resolveColor("var(--p)")} />
      </View>
    );

  if (!data)
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <LocalizedText style={{ fontSize: 18, color: colors.t2 }}>
          {isRTL ? "الموعد غير موجود" : "Appointment Not Found"}
        </LocalizedText>
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: colors.bd },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.n,
              fontSize: 24,
            }}
          >
            arrow_forward
          </LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={{ fontSize: 16, fontWeight: "800", color: colors.n }}>
          غرفة الانتظار
        </LocalizedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ padding: 16 }}>
        <View style={[styles.ticketCard, { backgroundColor: '#fff' }]}>
          <View style={[styles.ticketIcon, { backgroundColor: '#1E293B' }]}>
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: "#fff",
                fontSize: 46,
              }}
            >
              meeting_room
            </LocalizedText>
          </View>

          <LocalizedText style={{ fontSize: 11, color: colors.t3, marginBottom: 4 }}>
            رقمك في الانتظار
          </LocalizedText>
          <LocalizedText
            style={{
              fontSize: 48,
              fontWeight: "900",
              color: resolveColor("var(--p)"),
              lineHeight: 52,
            }}
          >
            {data?.queue_position}
          </LocalizedText>

          <View style={[styles.aheadPill, { backgroundColor: colors.s }]}>
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: resolveColor("var(--gr)"),
                fontSize: 18,
                marginRight: isRTL ? 0 : 6,
                marginLeft: isRTL ? 6 : 0,
              }}
            >
              groups
            </LocalizedText>
            <LocalizedText style={{ fontSize: 12, color: colors.t2 }}>
              يسبقك{" "}
              <LocalizedText style={{ color: colors.n, fontWeight: "bold" }}>
                {data?.ahead_count}
              </LocalizedText>{" "}
              مرضى
            </LocalizedText>
          </View>
        </View>

        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 12,
            marginTop: 14,
          }}
        >
          <View
            style={[
              styles.duoIcon,
              { backgroundColor: resolveColor("var(--ps)") },
            ]}
          >
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: resolveColor("var(--p)"),
                fontSize: 24,
              }}
            >
              stethoscope
            </LocalizedText>
          </View>
          <View
            style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}
          >
            <LocalizedText style={{ fontSize: 13, fontWeight: "700", color: colors.n }}>
              {data?.doctor_name}
            </LocalizedText>
            <LocalizedText style={{ fontSize: 10, color: colors.t3 }}>
              {pickLocalized(data?.specialty_ar, data?.specialty)} • الدور الثاني
            </LocalizedText>
          </View>
          <View
            style={[
              styles.timeBox,
              { backgroundColor: resolveColor("var(--ps)") },
            ]}
          >
            <LocalizedText
              style={{
                fontSize: 15,
                fontWeight: "900",
                color: resolveColor("var(--p)"),
              }}
            >
              ~{data?.wait_time}
            </LocalizedText>
            <LocalizedText style={{ fontSize: 8, color: resolveColor("var(--pt)") }}>
              دقيقة
            </LocalizedText>
          </View>
        </View>

        <View
          style={[
            styles.alertBox,
            { backgroundColor: resolveColor("var(--as)") },
          ]}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: resolveColor("var(--am)"),
              fontSize: 18,
              marginRight: isRTL ? 0 : 8,
              marginLeft: isRTL ? 8 : 0,
            }}
          >
            notifications_active
          </LocalizedText>
          <LocalizedText
            style={{
              flex: 1,
              fontSize: 11,
              color: "#8A6410",
              lineHeight: 18,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            سننبّهك عند اقتراب دورك. يمكنك مغادرة الانتظار والعودة في الوقت
            المناسب.
          </LocalizedText>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.n }]}
          onPress={() => router.replace("/(tabs)/consultations")}
        >
          <LocalizedText style={{ fontSize: 13, fontWeight: "800", color: "#fff" }}>
            حسناً، سأنتظر
          </LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  ticketCard: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: resolveColor("var(--ps)"),
  },
  ticketIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: resolveColor("var(--p)"),
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10,
  },
  aheadPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 14,
  },
  duoIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  timeBox: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
