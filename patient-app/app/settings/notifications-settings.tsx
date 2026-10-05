// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, StatusBar, Switch } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";
import type { IconName } from "../../src/components/Icon";
import { apiFetch } from "../../src/utils/api";
import { ScreenState } from "../../src/components/ScreenStates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_SWITCHES,
  DEVICE_SETTINGS_STORAGE_KEY,
  parseDeviceSwitches,
  persistToggle,
  serverToSwitches,
  type SwitchKey,
  type SwitchState,
} from "../../src/utils/notification-settings";

interface NotificationSetting {
  key: SwitchKey;
  label: string;
  description: string;
  icon: IconName;
  locked?: boolean;
}

const NOTIFICATION_ITEMS: NotificationSetting[] = [
  {
    key: "general",
    label: "الإشعارات العامة",
    description: "تحديثات عامة ومعلومات مهمة من التطبيق",
    icon: "notification",
  },
  {
    key: "appointments",
    label: "تذكير المواعيد",
    description: "تذكيرات قبل المواعيد المحجوزة بساعة و15 دقيقة",
    icon: "calendar",
  },
  {
    key: "orders",
    label: "تحديثات الطلبات",
    description: "متابعة حالة طلبات الصيدلية والتوصيل",
    icon: "shopping_cart",
  },
  {
    key: "offers",
    label: "عروض وخصومات",
    description: "عروض حصرية وخصومات على الخدمات والمنتجات",
    icon: "tag",
  },
  {
    key: "medications",
    label: "تذكير الأدوية",
    description: "تنبيهات بمواعيد تناول الأدوية حسب جدولك",
    icon: "medication",
  },
  {
    key: "doctorMessages",
    label: "رسائل الأطباء",
    description: "رسائل وملاحظات من الأطباء والاستشاريين",
    icon: "doctor",
  },
  {
    key: "emergency",
    label: "إشعارات الطوارئ",
    description: "تنبيهات السلامة والطوارئ الصحية الحرجة",
    icon: "alert",
    locked: true,
  },
];

const SOUND_ITEMS: NotificationSetting[] = [
  {
    key: "sound",
    label: "الصوت",
    description: "تشغيل صوت عند وصول الإشعارات",
    icon: "bell",
  },
  {
    key: "vibration",
    label: "الاهتزاز",
    description: "تفعيل الاهتزاز مع الإشعارات",
    icon: "pulse",
  },
];

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  // Q38: the server stores {channels, categories}; the switches are read and
  // written through the owner-decided mapping (src/utils/notification-settings).
  const [settings, setSettings] = useState<SwitchState>(DEFAULT_SWITCHES);
  const settingsRef = useRef<SwitchState>(DEFAULT_SWITCHES);
  const [saving, setSaving] = useState<SwitchKey | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const applySettings = (next: SwitchState) => {
    settingsRef.current = next;
    setSettings(next);
  };

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<unknown>('/users/me/notification-settings'),
      AsyncStorage.getItem(DEVICE_SETTINGS_STORAGE_KEY).catch(() => null),
    ])
      .then(([res, device]) => {
        applySettings({ ...DEFAULT_SWITCHES, ...serverToSwitches(res), ...parseDeviceSwitches(device), emergency: true });
      })
      .catch(() => setError('تعذر تحميل إعدادات الإشعارات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const toggleSetting = async (key: SwitchKey) => {
    if (saving) return;
    const prev = settingsRef.current;
    setSaveError(null);
    setSaving(key);
    // Show the flip immediately; persistToggle returns the previous state on failure.
    setSettings({ ...prev, [key]: !prev[key] });
    const result = await persistToggle(prev, key, {
      sendPatch: (body) => apiFetch('/users/me/notification-settings', { method: 'PATCH', body: JSON.stringify(body) }),
      saveDevice: (value) => AsyncStorage.setItem(DEVICE_SETTINGS_STORAGE_KEY, JSON.stringify(value)),
    });
    applySettings(result.settings);
    if (result.failed) setSaveError('تعذر حفظ الإعداد. أعدنا المفتاح إلى حالته السابقة.');
    setSaving(null);
  };

  const renderToggleRow = (
    item: NotificationSetting,
    index: number,
    isLast: boolean,
    delay: number,
  ) => (
    <Animated.View
      key={item.key}
      entering={FadeInDown.delay(delay).duration(400)}
    >
      <View
        style={[
          styles.toggleRow,
          !isLast && {
            borderBottomColor: colors.borderLight,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Switch
          value={settings[item.key]}
          onValueChange={() => {
            if (!item.locked) {
              void toggleSetting(item.key);
            }
          }}
          trackColor={{ false: colors.border, true: colors.primary + "50" }}
          thumbColor={settings[item.key] ? colors.primary : colors.textTertiary}
          disabled={item.locked || saving !== null}
        />
        <View style={styles.toggleInfo}>
          <View style={styles.toggleLabelRow}>
            <AppText variant="bodySM" color={colors.textPrimary}>
              {item.label}
            </AppText>
            {item.locked && (
              <View
                style={[
                  styles.lockedBadge,
                  { backgroundColor: colors.errorSurface },
                ]}
              >
                <Icon name="lock" size={12} color={colors.error} />
                <AppText variant="caption" color={colors.error}>
                  مطلوب
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="caption" color={colors.textTertiary}>
            {item.description}
          </AppText>
        </View>
        <View
          style={[
            styles.toggleIconWrap,
            { backgroundColor: colors.primarySurface },
          ]}
        >
          <Icon name={item.icon} size={20} color={colors.primary} />
        </View>
      </View>
    </Animated.View>
  );

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
        <AppText variant="h4">إعدادات الإشعارات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScreenState loading={loading} error={error} empty={false} emptyTitle="لا توجد إعدادات" onRetry={loadSettings}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={[
            styles.infoBanner,
            { backgroundColor: colors.primarySurface },
          ]}
        >
          <View style={styles.infoBannerRow}>
            <Icon name="info" size={18} color={colors.primary} />
            <AppText
              variant="bodySM"
              color={colors.primary}
              style={{ flex: 1 }}
            >
              تحكم بالإشعارات التي تريد استلامها. إشعارات الطوارئ لا يمكن
              إيقافها لضمان سلامتك.
            </AppText>
          </View>
        </Animated.View>

        {saveError ? (
          <View
            accessibilityRole="alert"
            style={[styles.infoBanner, { backgroundColor: colors.errorSurface }]}
          >
            <View style={styles.infoBannerRow}>
              <Icon name="warning" size={18} color={colors.error} />
              <AppText variant="bodySM" color={colors.error} style={{ flex: 1 }}>
                {saveError}
              </AppText>
            </View>
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <AppText variant="h5" style={styles.sectionLabel}>
            إشعارات التطبيق
          </AppText>
        </Animated.View>

        <Card style={styles.settingsCard}>
          {NOTIFICATION_ITEMS.map((item, index) =>
            renderToggleRow(
              item,
              index,
              index === NOTIFICATION_ITEMS.length - 1,
              200 + index * 60,
            ),
          )}
        </Card>

        <Animated.View entering={FadeInDown.delay(650).duration(500)}>
          <AppText variant="h5" style={styles.sectionLabel}>
            الصوت والاهتزاز
          </AppText>
        </Animated.View>

        <Card style={styles.settingsCard}>
          {SOUND_ITEMS.map((item, index) =>
            renderToggleRow(
              item,
              index,
              index === SOUND_ITEMS.length - 1,
              700 + index * 60,
            ),
          )}
        </Card>

        <Animated.View
          entering={FadeInDown.delay(850).duration(500)}
          style={styles.footer}
        >
          <View
            style={[
              styles.footerNote,
              { backgroundColor: colors.warningSurface },
            ]}
          >
            <Icon name="warning" size={18} color={colors.warning} />
            <AppText
              variant="caption"
              color={colors.warning}
              style={{ flex: 1 }}
            >
              تعطيل الإشعارات قد يؤدي إلى عدم استلام تذكيرات المواعيد والأدوية
              المهمة.
            </AppText>
          </View>
        </Animated.View>
      </ScrollView>
      </ScreenState>
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
    gap: 12,
    paddingBottom: 100,
  },
  infoBanner: {
    borderRadius: 14,
    padding: 14,
  },
  infoBannerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionLabel: {
    marginTop: 4,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleLabelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  toggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  footer: {
    paddingVertical: 8,
  },
  footerNote: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
});
