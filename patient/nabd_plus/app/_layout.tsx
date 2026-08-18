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
import { useDispatch } from 'react-redux';
import { guestLogin } from '../src/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../src/constants';
import { apiFetch } from '../src/utils/api';
import { getDeviceId } from '../src/utils/deviceId';
import NotificationHandler from '../src/components/NotificationHandler';
import OfflineBanner from '../src/components/OfflineBanner';
import { initSentry } from '../src/utils/sentry';
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

function StoreHydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const hydrate = async () => {
      try {
        const guestMode = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_MODE ?? '@nabdah_guest');
        if (guestMode === 'true') {
          // Re-authenticate with the backend using the stable device id so the
          // guest gets a REAL token bound to the SAME guest account — their
          // orders/bookings/history persist across restarts and merge on signup.
          try {
            const deviceId = await getDeviceId();
            const res: any = await apiFetch('/auth/guest', { method: 'POST', body: JSON.stringify({ deviceId }) });
            if (res?.token) {
              dispatch(guestLogin({ user: res.user, token: res.token }));
              return;
            }
          } catch { /* offline — fall back to local-only guest shell */ }
          dispatch(guestLogin({
            user: { id: 'guest_user', role: 'patient', full_name: 'زائر', phone: '', email: '' } as any,
            token: 'guest_token',
          }));
        }
      } catch {}
    };
    hydrate();
  }, [dispatch]);

  return <>{children}</>;
}

function RootLayout() {
  const [loaded, error] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'Cairo-ExtraBold': require('../assets/fonts/Cairo-ExtraBold.ttf'),
    'Cairo-Black': require('../assets/fonts/Cairo-Black.ttf'),
    'MaterialSymbolsRounded': require('../assets/fonts/MaterialSymbolsRounded.ttf'),
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
    <Provider store={store}>
      <StoreHydrator>
        <AppProvider>
          <SocketProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <CartProvider>
                  <DiagnosticsCartProvider>
                    <ConsultationsProvider>
                      <ThemedStatusBar />
                      <NotificationHandler />
                      <OfflineBanner />
                      <Stack 
                        screenOptions={{ headerShown: false }}
                      >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(onboarding)" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="room/[id]" />
                        <Stack.Screen name="ai-assistant" />
                        <Stack.Screen name="shared/location-picker" options={{ presentation: 'modal' }} />
                      </Stack>
                    </ConsultationsProvider>
                  </DiagnosticsCartProvider>
                </CartProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </SocketProvider>
        </AppProvider>
      </StoreHydrator>
    </Provider>
  );
}

import Constants, { ExecutionEnvironment } from 'expo-constants';

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

