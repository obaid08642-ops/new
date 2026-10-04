// @ts-nocheck
// app/_layout.tsx — Root Layout (Expo SDK 54)

// Polyfills must run before ANY other import (LiveKit expects DOMException).
import '../src/polyfills';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { I18nManager } from 'react-native';
import { store } from '../src/store';
import { AppProvider, useApp } from '../src/context/AppContext';
import { SocketProvider } from '../src/context/SocketContext';
import { CartProvider } from '../src/context/CartContext';
import { DiagnosticsCartProvider } from '../src/context/DiagnosticsCartContext';
import { ConsultationsProvider } from '../src/context/ConsultationsContext';
import NotificationHandler from '../src/components/NotificationHandler';
import OfflineBanner from '../src/components/OfflineBanner';
import { ToastProvider } from '../src/design-system';
import AppGate from '../src/components/AppGate';
import { initSentry } from '../src/utils/sentry';
import { ErrorBoundary, ScreenErrorBoundary } from '../src/components/ErrorBoundary';
import { SyncManager } from '../src/data/sync/SyncManager';
import { BackgroundSynchronizer } from '../src/data/sync/BackgroundSynchronizer';
import { DatabaseManager } from '../src/data/database/core/DatabaseManager';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

initSentry();

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark } = useApp();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayout() {
  // 12.A5 — the owner's typography. This app shipped six embedded Cairo weights
  // (1.4 MB of binaries) from a design system that predates the brand. Readex Pro
  // is the primary face and Noto Sans Arabic covers the Arabic script, both OFL
  // and redistributable.
  //
  // Six Cairo weights map onto the three Readex weights the family ships, so
  // SemiBold/ExtraBold/Black resolve to 500/700/700 rather than faking a weight
  // the face does not have. The call sites were renamed, not aliased: a style
  // still asking for `Cairo-Black` after this change would have silently fallen
  // back to a system font, and the rename is what makes that failure impossible.
  const [loaded, error] = useFonts({
    // The KEY is the family name every call site asks for. It must match
    // `fontFamily` exactly: a mismatch here is invisible to tsc and to every
    // test, and the symptom is the whole app quietly rendering in a system
    // font. tests/design-system/typography.test.ts asserts the two agree.
    'ReadexPro-300': require('../assets/fonts/ReadexPro-300.ttf'),
    'ReadexPro-400': require('../assets/fonts/ReadexPro-400.ttf'),
    'ReadexPro-500': require('../assets/fonts/ReadexPro-500.ttf'),
    'ReadexPro-700': require('../assets/fonts/ReadexPro-700.ttf'),
    'NotoSansArabic-400': require('../assets/fonts/NotoSansArabic-400.ttf'),
    'NotoSansArabic-500': require('../assets/fonts/NotoSansArabic-500.ttf'),
    'NotoSansArabic-700': require('../assets/fonts/NotoSansArabic-700.ttf'),
    MaterialSymbolsRounded: require('../assets/fonts/MaterialSymbolsRounded.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      // Initialize background sync
      const dbManager = DatabaseManager.getInstance();
      const syncManager = SyncManager.initialize(dbManager);
      const bgSync = new BackgroundSynchronizer(syncManager);
      bgSync.registerBackgroundFetch();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    // 15.5: the root boundary catches anything thrown by a provider or a layout,
    // which no per-screen boundary can see.
    <ErrorBoundary scope="root">
    <Provider store={store}>
      <AppProvider>
        {/* 15.3: optimistic rollbacks and failure explanations are shown as a
            toast, so the toast host has to exist for the whole tree. */}
        <ToastProvider>
          <SocketProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <CartProvider>
                  <DiagnosticsCartProvider>
                    <ConsultationsProvider>
                      <ThemedStatusBar />
                      <NotificationHandler />
                      <OfflineBanner />
                      <AppGate>
                      <Stack 
                        screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 250 }}
                      >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(onboarding)" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="room/[id]" />
                        <Stack.Screen name="ai-assistant" />
                        <Stack.Screen name="shared/location-picker" options={{ presentation: 'modal' }} />
                      </Stack>
                      </AppGate>
                    </ConsultationsProvider>
                  </DiagnosticsCartProvider>
                </CartProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </SocketProvider>
          </ToastProvider>
      </AppProvider>
    </Provider>
    </ErrorBoundary>
  );
}

import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * 15.5 — per-screen error boundaries.
 *
 * expo-router wraps every route beneath this layout in its own instance of the
 * given component, so a crash in one screen shows a fallback inside that screen
 * and the rest of the app keeps working. One declaration here covers all routes,
 * including any added later.
 */
export const unstable_settings = {
  screenErrorBoundary: ScreenErrorBoundary,
};

let RootComponent = RootLayout;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    const Sentry = require('@sentry/react-native');
    RootComponent = Sentry.wrap(RootLayout);
  } catch (e) {
    console.warn('[Sentry] Failed to wrap root component with Sentry:', e);
  }
}

export default RootComponent;

