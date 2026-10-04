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
import { AmbulanceDashboardNavigator } from './src/screens/ambulance/AmbulanceDashboard';
import { AmbulanceRegistration } from './src/screens/ambulance/AmbulanceRegistration';
import { MedicalJobsScreen, MedicalDrugIndexScreen } from './src/screens/shared/SharedScreens';

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

  if (appState === 'pending' || appState === 'suspended' || appState === 'rejected' || appState === 'offline') {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="Pending">
            {({ navigation }) => <ScreenBoundary name="PendingDashboard"><PendingDashboard providerType={pType} onExplore={() => navigation.navigate('GuestJobs' as never)} onLogout={async () => { await logout(); }} /></ScreenBoundary>}
          </Stack.Screen>
          <Stack.Screen name="GuestJobs">
            {({ navigation }) => <ScreenBoundary name="MedicalJobs"><MedicalJobsScreen onBack={() => navigation.goBack()} /></ScreenBoundary>}
          </Stack.Screen>
          <Stack.Screen name="GuestDrugIndex">
            {({ navigation }) => <ScreenBoundary name="MedicalDrugIndex"><MedicalDrugIndexScreen onBack={() => navigation.goBack()} /></ScreenBoundary>}
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
              if (t === 'pharmacy' || t === 'pharmacist') return <ScreenBoundary name="PharmacyDashboard"><PharmacyDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'doctor' || t === 'physician') return <ScreenBoundary name="DoctorDashboard"><DoctorDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'facility' || t === 'hospital' || t === 'clinic' || t === 'center') return <ScreenBoundary name="FacilityDashboard"><FacilityDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'home_care' || t === 'nursing' || t === 'nurse') return <ScreenBoundary name="NursingDashboard"><NursingDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'lab' || t === 'laboratory') return <ScreenBoundary name="LabDashboard"><LabDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'radiology' || t === 'radiologist' || t === 'scan_center') return <ScreenBoundary name="RadiologyDashboard"><RadiologyDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              if (t === 'ambulance' || t === 'paramedic' || t === 'emt') return <ScreenBoundary name="AmbulanceDashboard"><AmbulanceDashboardNavigator onLogout={doLogout} /></ScreenBoundary>;
              return <ScreenBoundary name="ProviderHome"><ProviderHome onLogout={doLogout} /></ScreenBoundary>;
            }}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Welcome">
              {({ navigation }) => <ScreenBoundary name="Welcome"><WelcomeScreen onSelectType={t => { setPType(t); navigation.navigate('Register'); }} onLogin={() => navigation.navigate('Login')} onGuestJobs={() => navigation.navigate('GuestJobs')} onGuestDrugIndex={() => navigation.navigate('GuestDrugIndex')} /></ScreenBoundary>}
            </Stack.Screen>
            <Stack.Screen name="Login">
              {({ navigation }) => <ScreenBoundary name="Login"><LoginScreen onSuccess={() => {}} onBack={() => navigation.goBack()} onForgot={() => navigation.navigate('Forgot')} onRegister={() => navigation.navigate('Welcome')} /></ScreenBoundary>}
            </Stack.Screen>
            <Stack.Screen name="Forgot">
              {({ navigation }) => <ScreenBoundary name="ForgotPassword"><ForgotPasswordScreen onBack={() => navigation.goBack()} onSuccess={() => navigation.goBack()} /></ScreenBoundary>}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {({ navigation }) => {
                if (pType === 'doctor')   return <ScreenBoundary name="DoctorRegistration"><DoctorRegistration   onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'facility') return <ScreenBoundary name="FacilityRegistration"><FacilityRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'pharmacy') return <ScreenBoundary name="PharmacyRegistration"><PharmacyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'lab') return <ScreenBoundary name="LabRegistration"><LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'radiology') return <ScreenBoundary name="RadiologyRegistration"><RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'nursing')  return <ScreenBoundary name="NursingRegistration"><NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                if (pType === 'ambulance') return <ScreenBoundary name="AmbulanceRegistration"><AmbulanceRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} /></ScreenBoundary>;
                return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;
              }}
            </Stack.Screen>
            <Stack.Screen name="Pending">
              {({ navigation }) => <ScreenBoundary name="PendingDashboard"><PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.navigate('Welcome')} /></ScreenBoundary>}
            </Stack.Screen>
            <Stack.Screen name="GuestJobs">
              {({ navigation }) => <ScreenBoundary name="MedicalJobs"><MedicalJobsScreen onBack={() => navigation.goBack()} /></ScreenBoundary>}
            </Stack.Screen>
            <Stack.Screen name="GuestDrugIndex">
              {({ navigation }) => <ScreenBoundary name="MedicalDrugIndex"><MedicalDrugIndexScreen onBack={() => navigation.goBack()} /></ScreenBoundary>}
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
import { ErrorBoundary, ScreenBoundary } from "./src/components/ErrorBoundary";
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
    // SafeAreaProvider stays outside the boundary: the root fallback needs insets too.
    <SafeAreaProvider>
      <ErrorBoundary screenName="AppRoot">
        <RootProvider>
          <AppGate>
            {/* P15.5: every screen below the root is individually recoverable, so one
                broken screen cannot blank the whole app. */}
            <ScreenBoundary name="AppNavigator">
              <AppNavigator />
            </ScreenBoundary>
          </AppGate>
        </RootProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
