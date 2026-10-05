// app/index.tsx — Animated splash → routing
import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { STORAGE_KEYS } from "../src/constants";
import { NabdLogo } from "../src/components/NabdLogo";
import { Txt, useScreenUi } from "../src/components/home/homeKit";
import { ensureGuestSession } from "../src/utils/guestSession";
import { guestLogin } from "../src/store/slices/authSlice";
import { launchRoute, needsSilentGuest } from "../src/utils/launchRoute";
import { restoreSession } from "../src/utils/authSession";

/**
 * The splash that opens the app: the Noon Dot on the canvas, then Home (HomeApp board). Colours come from the
 * tokens of the active theme (canvas, ink text, secondary text), type is Readex Pro.
 */
export default function Index() {
  const { c } = useScreenUi();
  const dispatch = useDispatch();

  useEffect(() => {
    // Decide while the logo plays (two quick local reads). A launch that goes to Home with no session opens the
    // silent guest session right away (owner decision B2); the first launch goes to Welcome and opens none.
    const plan = planLaunch();
    plan.catch(() => undefined); // a failure is handled when the splash is done (it falls back to Welcome)
    const t = setTimeout(() => checkAppState(plan), 2600); // let logo animation play
    return () => clearTimeout(t);
  }, []);

  const planLaunch = async () => {
    const [token, seen] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => null),
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE).catch(() => null),
    ]);
    const state = { hasSession: Boolean(token), welcomeSeen: seen === "true" };
    // the slice is not persisted: tell it about the session that is stored (guest or patient)
    if (token) {
      const refresh = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => null);
      const restored = restoreSession(token, refresh);
      if (restored) dispatch(restored);
    }
    return { route: launchRoute(state), guest: needsSilentGuest(state) ? ensureGuestSession() : null };
  };

  const checkAppState = async (plan: ReturnType<typeof planLaunch>) => {
    try {
      // First launch: Welcome. Every later launch: Home (as a patient, or as the guest the device already has or
      // just got). Checkout and booking enforce the session policy at the action boundary.
      const { route, guest } = await plan;
      if (guest) {
        const session = await Promise.race([guest, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))]);
        if (session) dispatch(guestLogin(session));
      }
      router.replace(route);
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
            {'common.appName'}
          </Txt>
          <Txt size={14} color={c.text.secondary} style={{ textAlign: "center" }}>
            {"common.tagline"}
          </Txt>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
