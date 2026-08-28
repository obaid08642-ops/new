import { setupPushNotifications } from "./src/utils/PushNotifications";
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

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoggedIn, user, logout, appState } = useAuth();
  const { theme } = useTheme();
  const [pType, setPType]   = useState('doctor');

  if (appState === 'checking') {
    return <SplashScreen onDone={() => {}} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        {appState === 'logged_in' ? (
          <Stack.Screen name="Dashboard">
            {(props) => {
              const t = (user?.providerType ?? pType).toLowerCase();
              const doLogout = async () => { await logout(); };
              if (t === 'pharmacy' || t === 'pharmacist') return <PharmacyDashboardNavigator onLogout={doLogout} />;
              // Governance gate: non-pharmacy provider surfaces have no reviewed production contract.
              // They remain visible only as an explicit unavailable state; no legacy dashboard can issue mutations.
              return <ProviderHome />;
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
                if (pType === 'ambulance') return <AmbulanceRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
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
import { PharmacyChatResponder } from "./src/screens/shared/PharmacyChatResponder";

export default function App() {
  React.useEffect(() => {
    setupPushNotifications();
  }, []);
  return (
    <SafeAreaProvider>
      <RootProvider>
        <AppNavigator />
      </RootProvider>
    </SafeAreaProvider>
  );
}
