// @ts-nocheck
// app/loyalty/referrals.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Clipboard,
  Share,
  StatusBar
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
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
} from "../../src/components/ui";

const REFERRALS_LIST = [
  {
    id: "1",
    name: "خالد الحربي",
    status: "registered",
    statusLabel: "تم التسجيل — في انتظار أول حجز",
    date: "18 يونيو 2026",
    reward: "+50 ر.س معلقة",
  },
  {
    id: "2",
    name: "عمر فاروق",
    status: "completed",
    statusLabel: "حجز مكتمل — تمت الإضافة للمحفظة",
    date: "10 يونيو 2026",
    reward: "+50 ر.س مضافة",
  },
  {
    id: "3",
    name: "سليمان العتيبي",
    status: "completed",
    statusLabel: "حجز مكتمل — تمت الإضافة للمحفظة",
    date: "01 يونيو 2026",
    reward: "+50 ر.س مضافة",
  },
];

export default function ReferralsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const referralCode = "NABDAH_AHMED50";

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert("نسخ الكود", "تم نسخ كود الإحالة الخاص بك بنجاح!");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `سجل في تطبيق نبض بلس للرعاية الصحية باستخدام كود الإحالة الخاص بي [ ${referralCode} ] واحصل على 50 ريال رصيد مجاني في محفظتك فور إتمام أول حجز استشارة أو خدمة طبية! \nرابط التحميل: https://nabdahplus.com/invite`,
      });
    } catch (error) {
      console.error(error);
    }
  };

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
            ادعُ أصدقاءك واكسب رصيداً في محفظتك
          </AppText>
        </View>
        <IconButton
          icon="info"
          onPress={() =>
            Alert.alert(
              "كيف يعمل البرنامج؟",
              "عند مشاركة الكود الخاص بك مع صديق، يحصل الصديق على 50 ر.س خصم فوري عند أول حجز. وبمجرد اكتمال حجزه، يتم إيداع 50 ر.س رصيد مسترجع في محفظتك!",
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
            {
              backgroundColor: colors.primarySurface,
              borderColor: colors.primary + "20",
            },
          ]}
        >
          <View
            style={[st.iconCircle, { backgroundColor: colors.primary + "18" }]}
          >
            <Icon name="gift" size={32} color={colors.primary} />
          </View>
          <AppText variant="h3" style={{ marginTop: 12 }}>
            أهدِ صديقك 50 ر.س واكسب 50 ر.س
          </AppText>
          <AppText
            variant="bodySM"
            color={colors.textSecondary}
            align="center"
            style={{ marginTop: 6, paddingHorizontal: 10, lineHeight: 20 }}
          >
            شارك كود الإحالة الخاص بك. بمجرد قيام صديقك بالتسجيل وإكمال أول موعد
            طبي أو طلب صيدلية، ستحصلان كلاكما على المكافأة فوراً!
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
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="h3" color={colors.primary}>
              {referralCode}
            </AppText>
          </View>

          <View
            style={{
              flexDirection: "row-reverse",
              gap: 10,
              marginTop: 16,
              width: "100%",
            }}
          >
            <Button
              label="نسخ الكود"
              variant="outline"
              icon="copy"
              onPress={handleCopyCode}
              style={{ flex: 1 }}
            />
            <Button
              label="مشاركة الكود"
              variant="primary"
              icon="share"
              onPress={handleShare}
              style={{ flex: 1.2 }}
            />
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={st.statsGrid}>
          <Card style={st.statCard}>
            <AppText variant="h3" color={colors.success}>
              100 ر.س
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              الأرباح المستلمة
            </AppText>
          </Card>
          <Card style={st.statCard}>
            <AppText variant="h3" color={colors.primary}>
              3 أصدقاء
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              إجمالي الأصدقاء المدعوين
            </AppText>
          </Card>
        </View>

        {/* Invites list */}
        <SectionHeader title="سجل الإحالات والمدعوين" />
        {REFERRALS_LIST.map((ref) => {
          const isCompleted = ref.status === "completed";
          return (
            <Card key={ref.id} style={st.refItem}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  gap: 12,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <View
                  style={[
                    st.avatarMini,
                    {
                      backgroundColor: isCompleted
                        ? colors.successSurface
                        : colors.primarySurface,
                    },
                  ]}
                >
                  <Icon
                    name="user"
                    size={18}
                    color={isCompleted ? colors.success : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <AppText variant="labelMD">{ref.name}</AppText>
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    style={{ textAlign: "right" }}
                  >
                    {ref.statusLabel}
                  </AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {ref.date}
                  </AppText>
                </View>
              </View>
              <Badge
                label={ref.reward}
                color={isCompleted ? colors.success : colors.primary}
              />
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

import { SectionHeader } from "../../src/components/ui";

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
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  refItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
