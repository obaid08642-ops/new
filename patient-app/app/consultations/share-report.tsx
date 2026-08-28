// @ts-nocheck
// EPIC4/S21: was a hardcoded REPORTS list + setTimeout "share" that did
// nothing. Now loads the real /medical-reports/mine list and shares the
// selected reports as a text bundle via the device share sheet (real action).
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

function fmtDate(d: any): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(dateLocale(), { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ShareReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/medical-reports/mine?limit=100");
        setReports(Array.isArray(res) ? res : res?.data || []);
      } catch (e) {
        console.error(e);
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (id: string) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleShare = async () => {
    const chosen = reports.filter((r) => selected.includes(r.id));
    if (chosen.length === 0) return;
    setSending(true);
    try {
      const text = chosen
        .map((r) =>
          [
            `■ ${pickLocalized(r.title_ar, r.title_en) || "تقرير طبي"}`,
            r.facility_name || r.doctor_name || "",
            fmtDate(r.issued_at || r.createdAt),
            r.summary ? `الملخص: ${r.summary}` : "",
            r.diagnosis ? `التشخيص: ${r.diagnosis}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n");
      await Share.share({ message: `تقاريري الطبية — عبر تطبيق نبض\n\n${text}` });
      router.back();
    } catch {
      showLocalizedAlert("خطأ", "تعذرت المشاركة — حاول لاحقاً");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">مشاركة تقارير مع الطبيب</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      >
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Icon name="shield" size={20} color={colors.info} />
            <AppText
              variant="bodySM"
              color={colors.textSecondary}
              style={{ flex: 1 }}
            >
              شارك تقاريرك مع طبيبك عبر أي تطبيق — أنت من يختار المستلم
            </AppText>
          </View>
        </Card>

        <SectionHeader title="اختر التقارير للمشاركة" />
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reports.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
            <Icon name="document" size={36} color={colors.textTertiary} />
            <AppText variant="body" color={colors.textSecondary}>
              لا توجد تقارير لمشاركتها بعد
            </AppText>
            <Button
              label="العودة للتقارير"
              size="sm"
              full={false}
              onPress={() => router.push("/reports/hub")}
            />
          </Card>
        ) : (
          reports.map((r) => {
            const sel = selected.includes(r.id);
            const isLab = !!r.lab_booking_id;
            return (
              <Card
                key={r.id}
                onPress={() => toggle(r.id)}
                style={[
                  st.reportCard,
                  sel && { borderColor: colors.primary, borderWidth: 2 },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={[
                      st.check,
                      {
                        borderColor: sel ? colors.primary : colors.border,
                        backgroundColor: sel ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {sel && <Icon name="check" size={14} color="#fff" />}
                  </View>
                  <View
                    style={[
                      st.rIcon,
                      { backgroundColor: isLab ? "#7A6BEA18" : "#23B5CE18" },
                    ]}
                  >
                    <Icon
                      name={isLab ? "testTube" : r.radiology_booking_id ? "scan" : "document"}
                      size={22}
                      color={isLab ? "#7A6BEA" : "#23B5CE"}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                    <AppText variant="h6">{pickLocalized(r.title_ar, r.title_en) || "تقرير طبي"}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {[r.facility_name || r.doctor_name, fmtDate(r.issued_at || r.createdAt)].filter(Boolean).join(" · ")}
                    </AppText>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {selected.length > 0 && (
        <View
          style={[
            st.bottom,
            {
              paddingBottom: insets.bottom + 8,
              backgroundColor: colors.surface,
              borderTopColor: colors.borderLight,
            },
          ]}
        >
          <Button
            label={`مشاركة ${selected.length} تقرير مع الطبيب`}
            variant="gradient"
            size="lg"
            icon="send"
            loading={sending}
            onPress={handleShare}
          />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  reportCard: { borderWidth: 1, borderColor: "transparent" },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
