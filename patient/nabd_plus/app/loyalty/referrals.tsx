// @ts-nocheck
// app/loyalty/referrals.tsx — REAL referral program (GET/POST /referrals)
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Clipboard,
  Share,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Input,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const STATUS_META: Record<string, { label: string; reward: string; done: boolean }> = {
  registered: { label: "تم التسجيل — في انتظار أول حجز", reward: "+100 نقطة معلقة", done: false },
  rewarded: { label: "حجز مكتمل — تمت إضافة النقاط", reward: "+100 نقطة", done: true },
};

export default function ReferralsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [stats, setStats] = useState({ total: 0, registered: 0, rewarded: 0, earned_points: 0 });
  const [invites, setInvites] = useState<any[]>([]);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/referrals/my");
      setCode(res.code || "");
      setStats(res.stats || { total: 0, registered: 0, rewarded: 0, earned_points: 0 });
      setInvites(Array.isArray(res.invites) ? res.invites : []);
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل بيانات الإحالة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopyCode = () => {
    if (!code) return;
    Clipboard.setString(code);
    showLocalizedAlert("نسخ الكود", "تم نسخ كود الإحالة الخاص بك بنجاح!");
  };

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `سجّل في تطبيق نبض بلس للرعاية الصحية باستخدام كود الإحالة [ ${code} ] واحصل على 50 نقطة هدية عند إتمام أول حجز — وسأحصل أنا على 100 نقطة!\nرابط التحميل: https://nabdahplus.com/invite`,
      });
    } catch {}
  };

  const handleApply = async () => {
    const c = applyCode.trim();
    if (!c) return;
    try {
      setApplying(true);
      await apiFetch("/referrals/apply", {
        method: "POST",
        body: JSON.stringify({ code: c }),
      });
      showLocalizedAlert("تم", "تم تطبيق كود الإحالة — أكمل أول حجز لتحصل على 50 نقطة هدية!");
      setApplyCode("");
    } catch (e: any) {
      showLocalizedAlert("تعذر التطبيق", e?.message || "الكود غير صالح أو غير متاح لحسابك");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 }]}>
        <Icon name="warning" size={44} color={colors.textTertiary} />
        <AppText variant="bodyMD" color={colors.textSecondary} align="center">{error}</AppText>
        <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
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
        <IconButton icon="back" onPress={() => router.back()} />
        <View style={{ alignItems: "center" }}>
          <AppText variant="h4">برنامج المكافآت والإحالة</AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            ادعُ أصدقاءك واكسبا نقاط نبض معاً
          </AppText>
        </View>
        <IconButton
          icon="info"
          onPress={() =>
            showLocalizedAlert(
              "كيف يعمل البرنامج؟",
              "شارك كودك مع صديق. عند تسجيله بالكود وإتمامه أول حجز مكتمل، يحصل هو على 50 نقطة وتحصل أنت على 100 نقطة في حساب الولاء الخاص بك.",
            )
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* Banner Card */}
        <Card
          style={[
            st.bannerCard,
            { backgroundColor: colors.primarySurface, borderColor: colors.primary + "20" },
          ]}
        >
          <View style={[st.iconCircle, { backgroundColor: colors.primary + "18" }]}>
            <Icon name="gift" size={32} color={colors.primary} />
          </View>
          <AppText variant="h3" style={{ marginTop: 12 }}>
            أهدِ صديقك 50 نقطة واكسب 100 نقطة
          </AppText>
          <AppText
            variant="bodySM"
            color={colors.textSecondary}
            align="center"
            style={{ marginTop: 6, paddingHorizontal: 10, lineHeight: 20 }}
          >
            شارك كود الإحالة الخاص بك. بمجرد تسجيل صديقك وإكماله أول موعد طبي،
            تُضاف النقاط لكلاكما تلقائياً!
          </AppText>
        </Card>

        {/* Referral Code Display */}
        <Card style={st.codeCard}>
          <AppText variant="caption" color={colors.textTertiary}>
            كود الإحالة الخاص بك
          </AppText>
          <View
            style={[
              st.codeBox,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
          >
            <AppText variant="h3" color={colors.primary}>
              {code || "—"}
            </AppText>
          </View>

          <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16, width: "100%" }}>
            <Button label="نسخ الكود" variant="outline" icon="content-copy" onPress={handleCopyCode} style={{ flex: 1 }} />
            <Button label="مشاركة الكود" variant="primary" icon="share" onPress={handleShare} style={{ flex: 1.2 }} />
          </View>
        </Card>

        {/* Apply a friend's code (new accounts) */}
        <Card style={{ gap: 10 }}>
          <AppText variant="h6" style={{ textAlign: "right" }}>لديك كود من صديق؟</AppText>
          <Input
            value={applyCode}
            onChangeText={setApplyCode}
            placeholder="أدخل كود الإحالة"
            icon="gift"
            autoCapitalize="characters"
          />
          <Button
            label="تطبيق الكود"
            variant="outline"
            icon="check_circle"
            loading={applying}
            onPress={handleApply}
          />
          <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: "right" }}>
            متاح للحسابات الجديدة قبل أول حجز مكتمل
          </AppText>
        </Card>

        {/* Stats Grid */}
        <View style={st.statsGrid}>
          <Card style={st.statCard}>
            <AppText variant="h3" color={colors.success}>
              {stats.earned_points} نقطة
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              النقاط المكتسبة
            </AppText>
          </Card>
          <Card style={st.statCard}>
            <AppText variant="h3" color={colors.primary}>
              {stats.total} {stats.total === 1 ? "صديق" : "أصدقاء"}
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              إجمالي المدعوين
            </AppText>
          </Card>
        </View>

        {/* Invites list */}
        <SectionHeader title="سجل الإحالات والمدعوين" />
        {invites.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 24, gap: 8 }}>
            <Icon name="users" size={36} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textTertiary} align="center">
              لم تدعُ أحداً بعد — شارك كودك مع أصدقائك لتبدأ الكسب
            </AppText>
          </Card>
        ) : (
          invites.map((ref) => {
            const meta = STATUS_META[ref.status] || STATUS_META.registered;
            return (
              <Card key={ref.id} style={st.refItem}>
                <View style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center", flex: 1 }}>
                  <View
                    style={[
                      st.avatarMini,
                      { backgroundColor: meta.done ? colors.successSurface : colors.primarySurface },
                    ]}
                  >
                    <Icon name="user" size={18} color={meta.done ? colors.success : colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                    <AppText variant="labelMD">{ref.name}</AppText>
                    <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: "right" }}>
                      {meta.label}
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {ref.created_at ? new Date(ref.created_at).toLocaleDateString(dateLocale()) : ""}
                    </AppText>
                  </View>
                </View>
                <Badge label={meta.reward} color={meta.done ? colors.success : colors.primary} />
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  bannerCard: { padding: 20, alignItems: "center" },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  codeCard: { padding: 20, alignItems: "center" },
  codeBox: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 10,
  },
  statsGrid: { flexDirection: "row-reverse", gap: 12 },
  statCard: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  refItem: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 12 },
  avatarMini: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
