// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../src/constants";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import { AppText, Card, Button, IconButton } from "../../src/components/ui";

const PERMISSIONS: {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
}[] = [
  {
    id: "notifications",
    icon: "notification",
    title: "الإشعارات",
    desc: "تذكيرات الأدوية والمواعيد والعروض",
  },
  {
    id: "camera",
    icon: "camera",
    title: "الكاميرا",
    desc: "مسح الوصفات والباركود وتصوير الأدوية",
  },
  {
    id: "location",
    icon: "location",
    title: "الموقع",
    desc: "البحث عن أقرب صيدلية ومختبر وطبيب",
  },
  {
    id: "health",
    icon: "monitor_heart",
    title: "البيانات الصحية",
    desc: "مزامنة المؤشرات الحيوية من الأجهزة",
  },
];

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const handleGrant = (id: string) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, "true");
    } catch (_err) {
      /* handled */
    }
    setIsLoading(false);
    router.replace("/(auth)/welcome");
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 20 }]}>
        <View style={st.iconWrap}>
          <Icon name="shield" size={36} color="#fff" />
        </View>
        <AppText variant="h2" color="#fff" align="center">
          الصلاحيات المطلوبة
        </AppText>
        <AppText variant="bodySM" color="rgba(255,255,255,0.85)" align="center">
          نحتاج بعض الأذونات لتقديم أفضل تجربة
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      >
        {PERMISSIONS.map((perm) => {
          const isGranted = granted.has(perm.id);
          return (
            <TouchableOpacity
              key={perm.id}
              activeOpacity={0.85}
              onPress={() => handleGrant(perm.id)}
            >
              <Card
                style={[
                  st.permCard,
                  isGranted && { borderColor: colors.primary, borderWidth: 2 },
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
                      st.permIcon,
                      {
                        backgroundColor: isGranted
                          ? colors.primarySurface
                          : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Icon
                      name={perm.icon}
                      size={24}
                      color={isGranted ? colors.primary : colors.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <AppText variant="h6">{perm.title}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {perm.desc}
                    </AppText>
                  </View>
                  <View
                    style={[
                      st.check,
                      {
                        borderColor: isGranted ? colors.primary : colors.border,
                        backgroundColor: isGranted
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isGranted && <Icon name="check" size={14} color="#fff" />}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
          label="متابعة"
          variant="gradient"
          size="lg"
          loading={isLoading}
          onPress={handleContinue}
        />
        <TouchableOpacity onPress={handleContinue} style={{ marginTop: 8 }}>
          <AppText variant="labelMD" color={colors.textTertiary} align="center">
            تخطي الآن
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  permCard: { borderWidth: 1, borderColor: "transparent" },
  permIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
