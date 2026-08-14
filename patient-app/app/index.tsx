// @ts-nocheck
// app/index.tsx — Animated splash → routing
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { STORAGE_KEYS } from "../src/constants";
import { useApp } from "../src/context/AppContext";
import { NabdahLogo } from "../src/components/NabdahLogo";
import { AppText } from "../src/components/ui";

export default function Index() {
  const { colors } = useApp();

  useEffect(() => {
    const t = setTimeout(checkAppState, 2600); // let logo animation play
    return () => clearTimeout(t);
  }, []);

  const checkAppState = async () => {
    try {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      } catch {
        token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      }

      const isGuest = await AsyncStorage.getItem(
        STORAGE_KEYS.GUEST_MODE ?? "@nabdah_guest",
      );

      if (token || isGuest) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/welcome");
      }
    } catch {
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeIn.duration(400)}
        exiting={FadeOut}
        style={{ alignItems: "center", gap: 18 }}
      >
        <NabdahLogo size={140} animated />
        <Animated.View
          entering={FadeIn.delay(1400).duration(600)}
          style={{ alignItems: "center", gap: 4 }}
        >
          <AppText variant="h1" align="center">
            نبض بلس
          </AppText>
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            رعايتك الصحية المتكاملة
          </AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center" },
});
