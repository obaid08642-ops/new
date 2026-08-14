// @ts-nocheck
import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";
import * as Location from "expo-location";
import { apiFetch } from "../../src/utils/api";

const EMERGENCY_NUMBERS = {
  ambulance: "997",
  police: "999",
  fire: "998",
  traffic: "993",
  poison: "920016110",
};

export default function EmergencySOSScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [isSending, setIsSending] = useState(false);

  const handleSOS = useCallback(() => {
    Alert.alert(
      "تأكيد طلب الطوارئ",
      "سيتم إرسال موقعك الحالي وطلب إسعاف فوري. هل أنت متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "نعم، أرسل طلب طوارئ",
          style: "destructive",
          onPress: async () => {
            setIsSending(true);
            try {
              let { status } =
                await Location.requestForegroundPermissionsAsync();
              let locationData = null;
              if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({});
                locationData = {
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                };
              }

              const res = await apiFetch<any>("/emergency/trigger", {
                method: "POST",
                body: JSON.stringify({
                  location: locationData,
                  type: "ambulance",
                }),
              });

              if (res && res.id) {
                router.push({
                  pathname: "/emergency/sos-active",
                  params: { emergencyId: res.id },
                });
              } else {
                Linking.openURL(`tel:${EMERGENCY_NUMBERS.ambulance}`);
              }
            } catch (err) {
              console.log("Error triggering SOS:", err);
              Linking.openURL(`tel:${EMERGENCY_NUMBERS.ambulance}`);
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  }, []);

  const callNumber = useCallback((number: string) => {
    Linking.openURL(`tel:${number}`).catch((_err) => {
      /* handled */
    });
  }, []);

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h3" color="#fff">
            الطوارئ
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
      </View>

      <View style={st.content}>
        {/* SOS Button */}
        <Animated.View entering={FadeIn.duration(600)} style={st.sosWrap}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSOS}
            disabled={isSending}
          >
            <View
              style={[
                st.sosBtn,
                {
                  shadowColor: "#F0695C",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 24,
                  elevation: 16,
                },
              ]}
            >
              <Icon name="emergency" size={48} color="#fff" />
              <AppText variant="h2" color="#fff">
                {isSending ? "جاري الإرسال..." : "SOS"}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.8)">
                اضغط لطلب إسعاف فوري
              </AppText>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Calls */}
        <Animated.View entering={FadeInDown.delay(200)} style={st.quickCalls}>
          <AppText variant="h5" align="center" style={{ marginBottom: 12 }}>
            اتصال سريع
          </AppText>
          <View style={st.callGrid}>
            {[
              {
                label: "إسعاف",
                number: EMERGENCY_NUMBERS.ambulance,
                icon: "emergency" as const,
                color: "#F0695C",
              },
              {
                label: "شرطة",
                number: EMERGENCY_NUMBERS.police,
                icon: "shield" as const,
                color: "#23B5CE",
              },
              {
                label: "إطفاء",
                number: EMERGENCY_NUMBERS.fire,
                icon: "fire" as const,
                color: "#F0A526",
              },
              {
                label: "مرور",
                number: EMERGENCY_NUMBERS.traffic,
                icon: "car" as const,
                color: "#10B981",
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => callNumber(item.number)}
                style={[
                  st.callCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[st.callIcon, { backgroundColor: item.color + "15" }]}
                >
                  <Icon name={item.icon} size={24} color={item.color} />
                </View>
                <AppText variant="labelMD">{item.label}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {item.number}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Tracking button */}
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={{ paddingHorizontal: 20 }}
        >
          <Card
            onPress={() => router.push("/emergency/tracking" as never)}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={[st.trackIcon, { backgroundColor: colors.primarySurface }]}
            >
              <Icon name="location" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="h6">تتبع الإسعاف</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                تتبع موقع سيارة الإسعاف
              </AppText>
            </View>
            <Icon name="chevronLeft" size={16} color={colors.textTertiary} />
          </Card>
        </Animated.View>

        {/* Poison Center */}
        <Animated.View
          entering={FadeInDown.delay(500)}
          style={{ paddingHorizontal: 20 }}
        >
          <TouchableOpacity
            onPress={() => callNumber(EMERGENCY_NUMBERS.poison)}
            style={[
              st.poisonCard,
              {
                backgroundColor: colors.warningSurface,
                borderColor: colors.warningLight,
              },
            ]}
          >
            <Icon name="info" size={20} color={colors.warning} />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="labelMD" color={colors.warning}>
                مركز السموم
              </AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {EMERGENCY_NUMBERS.poison}
              </AppText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: { flex: 1, gap: 20, paddingTop: 24 },
  sosWrap: { alignItems: "center", marginBottom: 8 },
  sosBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  quickCalls: { paddingHorizontal: 20 },
  callGrid: { flexDirection: "row-reverse", gap: 10, flexWrap: "wrap" },
  callCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  callIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  trackIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  poisonCard: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
