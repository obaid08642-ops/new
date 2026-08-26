// @ts-nocheck
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";

const SOCIAL_LINKS = [
  {
    id: "website",
    label: "الموقع الإلكتروني",
    icon: "globe",
    url: "https://nabdahplus.com",
  },
  {
    id: "twitter",
    label: "تويتر",
    icon: "share",
    url: "https://twitter.com/nabdahplus",
  },
  {
    id: "instagram",
    label: "إنستغرام",
    icon: "image",
    url: "https://instagram.com/nabdahplus",
  },
];

const TEAM_MEMBERS = [
  {
    name: "فريق الهندسة",
    role: "تطوير التطبيق والبنية التحتية",
    icon: "settings",
  },
  { name: "فريق المنتج", role: "التصميم وتجربة المستخدم", icon: "sparkles" },
  {
    name: "الفريق الطبي",
    role: "المراجعة والاستشارات الطبية",
    icon: "monitor_heart",
  },
  { name: "فريق الدعم", role: "خدمة العملاء على مدار الساعة", icon: "chat" },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">عن التطبيق</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.logoSection}
        >
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: colors.primarySurface },
            ]}
          >
            <Icon name="monitor_heart" size={52} color={colors.primary} />
          </View>
          <AppText variant="h2" color={colors.textPrimary}>
            نبض بلس
          </AppText>
          <View
            style={[
              styles.versionBadge,
              { backgroundColor: colors.primarySurface },
            ]}
          >
            <AppText variant="labelSM" color={colors.primary}>
              v1.0.0
            </AppText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card style={styles.descriptionCard}>
            <AppText
              variant="bodySM"
              color={colors.textSecondary}
              style={styles.descriptionText}
            >
              نبض بلس هو تطبيقك الصحي الشامل في المملكة العربية السعودية. نقدم
              لك خدمات استشارات طبية عن بُعد مع أطباء مرخصين، وصيدلية إلكترونية
              متكاملة مع توصيل سريع، وحجز تحاليل مخبرية، وإدارة السجل الصحي
              الرقمي، كل ذلك من خلال منصة واحدة آمنة ومعتمدة. نسعى لتسهيل الوصول
              إلى الرعاية الصحية عالية الجودة في أي وقت ومن أي مكان.
            </AppText>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <AppText variant="h5" style={styles.sectionTitle}>
            تابعنا
          </AppText>
          <Card>
            {SOCIAL_LINKS.map((link, index) => (
              <TouchableOpacity
                key={link.id}
                onPress={() => handleOpenLink(link.url)}
                activeOpacity={0.7}
                style={[
                  styles.linkRow,
                  index < SOCIAL_LINKS.length - 1 && {
                    borderBottomColor: colors.borderLight,
                    borderBottomWidth: 1,
                  },
                ]}
              >
                <Icon
                  name="chevronLeft"
                  size={18}
                  color={colors.textTertiary}
                />
                <View style={styles.linkInfo}>
                  <AppText variant="bodySM" color={colors.textPrimary}>
                    {link.label}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.linkIconWrap,
                    { backgroundColor: colors.primarySurface },
                  ]}
                >
                  <Icon
                    name={link.icon as any}
                    size={20}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <AppText variant="h5" style={styles.sectionTitle}>
            فريق العمل
          </AppText>
          <View style={styles.teamGrid}>
            {TEAM_MEMBERS.map((member, index) => (
              <Animated.View
                key={member.name}
                entering={FadeInDown.delay(450 + index * 80).duration(500)}
                style={styles.teamCardWrap}
              >
                <Card style={styles.teamCard}>
                  <View
                    style={[
                      styles.teamIconWrap,
                      { backgroundColor: colors.primarySurface },
                    ]}
                  >
                    <Icon
                      name={member.icon as any}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <AppText
                    variant="labelMD"
                    color={colors.textPrimary}
                    align="center"
                  >
                    {member.name}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={colors.textTertiary}
                    align="center"
                    numberOfLines={2}
                  >
                    {member.role}
                  </AppText>
                </Card>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Card style={styles.legalCard}>
            <TouchableOpacity
              onPress={() => router.push("/settings/terms")}
              style={[
                styles.legalRow,
                { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
              ]}
            >
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
              <AppText
                variant="bodySM"
                color={colors.textPrimary}
                style={{ flex: 1 }}
              >
                الشروط والأحكام
              </AppText>
              <Icon name="document" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/settings/privacy")}
              style={styles.legalRow}
            >
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
              <AppText
                variant="bodySM"
                color={colors.textPrimary}
                style={{ flex: 1 }}
              >
                سياسة الخصوصية
              </AppText>
              <Icon name="lock" size={20} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(800).duration(500)}
          style={styles.footer}
        >
          <View
            style={[
              styles.madeWithLove,
              { backgroundColor: colors.primarySurface },
            ]}
          >
            <View style={styles.madeWithLoveRow}>
              <Icon name="favorite" size={16} color={colors.error} />
              <AppText variant="labelMD" color={colors.primary}>
                مصنوع بحب في المملكة العربية السعودية
              </AppText>
            </View>
            <View style={styles.flagRow}>
              <Icon name="location" size={14} color={colors.textTertiary} />
              <AppText variant="caption" color={colors.textTertiary}>
                الرياض، المملكة العربية السعودية
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color={colors.textTertiary} align="center">
            جميع الحقوق محفوظة لشركة نبض بلس 2026
          </AppText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  logoSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  descriptionCard: {
    padding: 18,
  },
  descriptionText: {
    lineHeight: 26,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  linkInfo: {
    flex: 1,
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teamGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 12,
  },
  teamCardWrap: {
    width: "47%",
  },
  teamCard: {
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  teamIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  legalCard: {
    padding: 4,
  },
  legalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  footer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  madeWithLove: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  madeWithLoveRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  flagRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
});
