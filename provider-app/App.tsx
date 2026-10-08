import { setupPushNotifications } from "./src/utils/PushNotifications";
import { registerForPushNotificationsAsync } from "./src/utils/notifications";
/**
 * NABDAH PLUS — App.tsx
 * Phase 0-5: Doctor + Facility + Pharmacy + Lab/Radiology + Nursing
 */
import React, { useState, useCallback, useEffect } from 'react';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Expo AV has been deprecated'
]);
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RootProvider, useAuth, useTheme } from './src/context';
import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';
import { PendingDashboard } from './src/screens/auth/PendingDashboard';
import type { BlockedAccountState } from './src/utils/accountStatus';
import { DoctorRegistration }         from './src/screens/doctor/DoctorRegistration';
import { DoctorDashboardNavigator }   from './src/screens/doctor/DoctorDashboard';
import { FacilityRegistration }       from './src/screens/facility/FacilityRegistration';
import { FacilityDashboardNavigator } from './src/screens/facility/FacilityDashboard';
import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';
import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';
import { LabRegistration }           from './src/screens/lab/LabRegistration';
import { LabDashboardNavigator }     from './src/screens/lab/LabDashboard';
import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';
import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';
import { NursingRegistration }       from './src/screens/nursing/NursingRegistration';
import { NursingDashboardNavigator } from './src/screens/nursing/NursingDashboard';
import { MedicalJobsScreen, MedicalDrugIndexScreen, CertificatesConfigScreen } from './src/screens/shared/SharedScreens';

import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

// E2E-only hook: in a test build (EXPO_PUBLIC_NABD_E2E=1, inlined at build time) the browser test harness reads
// the focused screen and opens registered screens by name through this ref. Absent from production builds.
const navigationRef = createNavigationContainerRef<any>();
if (process.env.EXPO_PUBLIC_NABD_E2E === '1' && typeof window !== 'undefined') {
  (window as any).__NABD_NAV__ = navigationRef;
}
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinkingOptions } from '@react-navigation/native';

const Stack = createNativeStackNavigator();

// N2: deep-link / push-tap routing. Maps a notification's related_type/related_id
// to the right screen so a tap lands on the exact entity, not the dashboard.
const linking: LinkingOptions<any> = {
  prefixes: ['nabdplus-provider://', 'https://provider.nabd.plus'],
  config: {
    screens: {
      Dashboard: {
        screens: {
          Jobs: 'jobs',
          Order: 'order/:id',
          Booking: 'booking/:id',
          Chat: 'chat/:id',
          Payout: 'payout/:id',
        },
      },
    },
  },
  // Resolve a notification's related_type/related_id into a screen path.
  getStateFromPath: (path, options) => {
    const parts = path.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [type, id] = parts;
      const screen = { job: 'Jobs', order: 'Order', booking: 'Booking', chat: 'Chat', payout: 'Payout' }[type as string];
      if (screen) return { routes: [{ name: 'Dashboard', state: { routes: [{ name: screen, params: { id } }] } }] };
    }
    return undefined;
  },
};

function AppNavigator() {
  const { isLoggedIn, user, logout, appState } = useAuth();
  const { theme } = useTheme();
  const [pType, setPType]   = useState('doctor');
  // Register this device's push token once the provider is signed in (the token used to be
  // fetched and thrown away, so providers never received a push — not even for new orders).
  React.useEffect(() => {
    if (appState !== 'logged_in') return;
    registerForPushNotificationsAsync().catch(() => null);
  }, [appState, user?.id]);

  if (appState === 'checking') {
    return <SplashScreen onDone={() => {}} />;
  }

  if (appState === 'pending' || appState === 'needs_changes' || appState === 'suspended' || appState === 'rejected' || appState === 'offline') {
    // every account that is not approved yet: the screen says which state (reason + resubmit for needs_changes / rejected)
    const blocked: BlockedAccountState = appState === 'offline' ? 'pending' : appState;
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="Pending">
            {({ navigation }) => <PendingDashboard status={blocked} providerType={pType} onExplore={() => navigation.navigate('GuestJobs' as never)} onOpenDocuments={() => navigation.navigate('Documents' as never)} onLogout={async () => { await logout(); }} />}
          </Stack.Screen>
          <Stack.Screen name="Documents">
            {({ navigation }) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>
          <Stack.Screen name="GuestJobs">
            {({ navigation }) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>
          <Stack.Screen name="GuestDrugIndex">
            {({ navigation }) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        {appState === 'logged_in' ? (
          <Stack.Screen name="Dashboard">
            {(props) => {
              const t = (user?.providerType ?? pType).toLowerCase();
              const doLogout = async () => { await logout(); };
              if (t === 'pharmacy' || t === 'pharmacist') return <PharmacyDashboardNavigator onLogout={doLogout} />;
              if (t === 'doctor' || t === 'physician') return <DoctorDashboardNavigator onLogout={doLogout} />;
              if (t === 'facility' || t === 'hospital' || t === 'clinic' || t === 'center') return <FacilityDashboardNavigator onLogout={doLogout} />;
              if (t === 'home_care' || t === 'nursing' || t === 'nurse') return <NursingDashboardNavigator onLogout={doLogout} />;
              if (t === 'lab' || t === 'laboratory') return <LabDashboardNavigator onLogout={doLogout} />;
              if (t === 'radiology' || t === 'radiologist' || t === 'scan_center') return <RadiologyDashboardNavigator onLogout={doLogout} />;
              return <ProviderHome onLogout={doLogout} />;
            }}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Welcome">
              {({ navigation }) => <WelcomeScreen onSelectType={t => { setPType(t); navigation.navigate('Register'); }} onLogin={() => navigation.navigate('Login')} onGuestJobs={() => navigation.navigate('GuestJobs')} onGuestDrugIndex={() => navigation.navigate('GuestDrugIndex')} />}
            </Stack.Screen>
            <Stack.Screen name="Login">
              {({ navigation }) => <LoginScreen onSuccess={() => {}} onBack={() => navigation.goBack()} onForgot={() => navigation.navigate('Forgot')} onRegister={() => navigation.navigate('Welcome')} />}
            </Stack.Screen>
            <Stack.Screen name="Forgot">
              {({ navigation }) => <ForgotPasswordScreen onBack={() => navigation.goBack()} onSuccess={() => navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {({ navigation }) => {
                if (pType === 'doctor')   return <DoctorRegistration   onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                if (pType === 'facility') return <FacilityRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                if (pType === 'pharmacy') return <PharmacyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                if (pType === 'lab') return <LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                if (pType === 'radiology') return <RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                if (pType === 'nursing')  return <NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;
              }}
            </Stack.Screen>
            <Stack.Screen name="Pending">
              {({ navigation }) => <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.navigate('Welcome')} />}
            </Stack.Screen>
            <Stack.Screen name="GuestJobs">
              {({ navigation }) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="GuestDrugIndex">
              {({ navigation }) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import { ProviderHome } from "./src/screens/shared/ProviderHome";
import { LiveKitRoomProvider } from "./src/screens/shared/LiveKitRoomProvider";
import { AppGate } from "./src/components/AppGate";
import { initProviderSentry } from "./src/utils/sentry";

initProviderSentry();

export default function App() {
  React.useEffect(() => {
    setupPushNotifications();
  }, []);
  // Cross-platform online presence (admin/analytics/online): heartbeat every 60s while logged in.
  React.useEffect(() => {
    let timer: any = null;
    try {
      const api = require('./src/api/client').default;
      const post = () => api.post('/auth/heartbeat', { client: 'provider-app' }).catch(() => null);
      post();
      timer = setInterval(post, 60000);
    } catch { /* observability only */ }
    return () => { if (timer) clearInterval(timer); };
  }, []);
  return (
    <SafeAreaProvider>
      <RootProvider>
        <AppGate>
          <AppNavigator />
        </AppGate>
      </RootProvider>
    </SafeAreaProvider>
  );
}
