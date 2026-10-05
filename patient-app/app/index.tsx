// app/index.tsx — Animated splash → routing
import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { STORAGE_KEYS } from "../src/constants";
import { NabdLogo } from "../src/components/NabdLogo";
import { Txt, useScreenUi } from "../src/components/home/homeKit";

/**
 * The splash that opens the app: the Noon Dot on the canvas, then Home (HomeApp board). Colours come from the
 * tokens of the active theme (canvas, ink text, secondary text), type is Readex Pro.
 */
export default function Index() {
  const { c } = useScreenUi();

  useEffect(() => {
    const t = setTimeout(checkAppState, 2600); // let logo animation play
    return () => clearTimeout(t);
  }, []);

  const checkAppState = async () => {
    try {
      // Preserve authenticated and guest sessions; the splash must never clear patient data.
      await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);
      await AsyncStorage.getItem(STORAGE_KEYS.GUEST_MODE ?? "@nabdah_guest");

      // Public-first navigation: browsing must not require authentication.
      // Checkout/service mutations enforce the session policy at the action boundary.
      // Existing authenticated and device-bound guest sessions still land on tabs.
      router.replace("/(tabs)");
    } catch {
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg.canvas }}>
      <Animated.View
        entering={FadeIn.duration(400)}
        exiting={FadeOut}
        style={{ alignItems: "center", gap: 18 }}
      >
        <NabdLogo size={140} pulse />
        <Animated.View
          entering={FadeIn.delay(1400).duration(600)}
          style={{ alignItems: "center", gap: 4 }}
        >
          <Txt weight="bold" size={26} style={{ textAlign: "center" }}>
            نبض بلس
          </Txt>
          <Txt size={14} color={c.text.secondary} style={{ textAlign: "center" }}>
            رعايتك الصحية المتكاملة
          </Txt>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
