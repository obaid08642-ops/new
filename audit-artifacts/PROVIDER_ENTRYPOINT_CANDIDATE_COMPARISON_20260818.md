# Provider App entrypoint candidate comparison
5f8e91e4705d4ff0f36b21bc92c0013bfff055f612c82ac27b9553dc6f8ebb9f  /home/ubuntu/nabdah-fix-source/provider-app/App.tsx
91f4c29ef6a914c38f3853ce72397912c08e3aec2d980d9e1c13e16aadde711e  /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/App.tsx
5f8e91e4705d4ff0f36b21bc92c0013bfff055f612c82ac27b9553dc6f8ebb9f  /home/ubuntu/nabdah-source-readonly/provider-app/App.tsx

## Candidate differences
--- /home/ubuntu/nabdah-source-readonly/provider-app/App.tsx	2026-07-18 14:24:03.000000000 +0000
+++ /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/App.tsx	2026-08-12 18:59:51.000000000 +0000
@@ -15,19 +15,57 @@
 import { RootProvider, useAuth, useTheme } from './src/context';
 import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';
 import { PendingDashboard } from './src/screens/auth/PendingDashboard';
-import { DoctorRegistration }         from './src/screens/doctor/DoctorRegistration';
-import { DoctorDashboardNavigator }   from './src/screens/doctor/DoctorDashboard';
-import { FacilityRegistration }       from './src/screens/facility/FacilityRegistration';
-import { FacilityDashboardNavigator } from './src/screens/facility/FacilityDashboard';
-import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';
-import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';
-import { LabRegistration }           from './src/screens/lab/LabRegistration';
-import { LabDashboardNavigator }     from './src/screens/lab/LabDashboard';
-import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';
-import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';
-import { NursingRegistration }       from './src/screens/nursing/NursingRegistration';
-import { NursingDashboardNavigator } from './src/screens/nursing/NursingDashboard';
-import { MedicalJobsScreen, MedicalDrugIndexScreen } from './src/screens/shared/SharedScreens';
+
+// ── Lazy screen loader (Expo Go hardening) ──────────────────────────────────
+// Previously every dashboard/registration screen was imported eagerly here, so
+// ONE module touching an unavailable native API at import time (e.g. expo-av /
+// expo-camera / maps in Expo Go) aborted the whole bundle evaluation and the
+// app died with "main has not been registered". Now each screen module is
+// require()d on first render; a failing screen shows an isolated error instead
+// of killing the app.
+import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
+
+// NOTE: Metro requires literal string paths in require() — each loader below
+// carries its own literal so bundling works; the module factory only executes
+// when the screen is first rendered (deferred evaluation), not at app boot.
+function lazyScreen(loader: () => any, label: string) {
+  let cached: any = undefined;
+  return function LazyScreen(props: any) {
+    if (cached === undefined) {
+      try { cached = loader(); }
+      catch (e: any) { console.error(`[LazyScreen] Failed to load ${label}:`, e?.message || e); cached = null; }
+    }
+    const C = cached;
+    if (!C) {
+      return (
+        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' }}>
+          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>تعذر تحميل هذه الشاشة</Text>
+          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8 }}>
+            بعض الميزات الأصلية (كاميرا/خرائط/صوت) تحتاج نسخة Development Build ولا تعمل داخل Expo Go.
+          </Text>
+        </View>
+      );
+    }
+    return <C {...props} />;
+  };
+}
+
+const DoctorRegistration          = lazyScreen(() => require('./src/screens/doctor/DoctorRegistration').DoctorRegistration, 'DoctorRegistration');
+const DoctorDashboardNavigator    = lazyScreen(() => require('./src/screens/doctor/DoctorDashboard').DoctorDashboardNavigator, 'DoctorDashboard');
+const FacilityRegistration        = lazyScreen(() => require('./src/screens/facility/FacilityRegistration').FacilityRegistration, 'FacilityRegistration');
+const FacilityDashboardNavigator  = lazyScreen(() => require('./src/screens/facility/FacilityDashboard').FacilityDashboardNavigator, 'FacilityDashboard');
+const PharmacyRegistration        = lazyScreen(() => require('./src/screens/pharmacy/PharmacyRegistration').PharmacyRegistration, 'PharmacyRegistration');
+const PharmacyDashboardNavigator  = lazyScreen(() => require('./src/screens/pharmacy/PharmacyDashboard').PharmacyDashboardNavigator, 'PharmacyDashboard');
+const LabRegistration             = lazyScreen(() => require('./src/screens/lab/LabRegistration').LabRegistration, 'LabRegistration');
+const LabDashboardNavigator       = lazyScreen(() => require('./src/screens/lab/LabDashboard').LabDashboardNavigator, 'LabDashboard');
+const RadiologyRegistration       = lazyScreen(() => require('./src/screens/radiology/RadiologyRegistration').RadiologyRegistration, 'RadiologyRegistration');
+const RadiologyDashboardNavigator = lazyScreen(() => require('./src/screens/radiology/RadiologyDashboard').RadiologyDashboardNavigator, 'RadiologyDashboard');
+const NursingRegistration         = lazyScreen(() => require('./src/screens/nursing/NursingRegistration').NursingRegistration, 'NursingRegistration');
+const AmbulanceRegistration       = lazyScreen(() => require('./src/screens/ambulance/AmbulanceRegistration').AmbulanceRegistration, 'AmbulanceRegistration');
+const NursingDashboardNavigator   = lazyScreen(() => require('./src/screens/nursing/NursingDashboard').NursingDashboardNavigator, 'NursingDashboard');
+const AmbulanceDashboardNavigator = lazyScreen(() => require('./src/screens/ambulance/AmbulanceDashboard').AmbulanceDashboardNavigator, 'AmbulanceDashboard');
+const MedicalJobsScreen           = lazyScreen(() => require('./src/screens/shared/SharedScreens').MedicalJobsScreen, 'MedicalJobsScreen');
+const MedicalDrugIndexScreen      = lazyScreen(() => require('./src/screens/shared/SharedScreens').MedicalDrugIndexScreen, 'MedicalDrugIndexScreen');
 
 import { NavigationContainer } from '@react-navigation/native';
 import { createNativeStackNavigator } from '@react-navigation/native-stack';
@@ -57,6 +95,7 @@
               if (t === 'lab') return <LabDashboardNavigator onLogout={doLogout} />;
               if (t === 'radiology') return <RadiologyDashboardNavigator onLogout={doLogout} />;
               if (t === 'nursing' || t === 'nurse' || t === 'home_care')  return <NursingDashboardNavigator  onLogout={doLogout} />;
+              if (t === 'ambulance' || t === 'emergency' || t === 'driver' || t === 'delivery') return <AmbulanceDashboardNavigator onLogout={doLogout} />;
               return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;
             }}
           </Stack.Screen>
@@ -79,6 +118,7 @@
                 if (pType === 'lab') return <LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                 if (pType === 'radiology') return <RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                 if (pType === 'nursing')  return <NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
+                if (pType === 'ambulance') return <AmbulanceRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;
                 return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;
               }}
             </Stack.Screen>
@@ -98,19 +138,45 @@
   );
 }
 
-import { ProviderHome } from "./src/screens/shared/ProviderHome";
-import { LiveKitRoomProvider } from "./src/screens/shared/LiveKitRoomProvider";
-import { PharmacyChatResponder } from "./src/screens/shared/PharmacyChatResponder";
+
+class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
+  state = { error: null as string | null };
+  static getDerivedStateFromError(e: any) { return { error: String(e?.message || e) }; }
+  componentDidCatch(e: any) { try { console.error('AppErrorBoundary', e); } catch {} }
+  render() {
+    if (this.state.error) {
+      const { View, Text, ScrollView } = require('react-native');
+      return (
+        <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
+          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 10 }}>Nabd Provider</Text>
+          <Text style={{ color: '#FCA5A5', fontSize: 13, textAlign: 'center' }}>حدث خطأ أثناء التحميل: {this.state.error}</Text>
+          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 12, textAlign: 'center' }}>أعد تشغيل التطبيق، وإن استمر الخطأ أرسل لنا هذه الرسالة.</Text>
+        </View>
+      );
+    }
+    return this.props.children as any;
+  }
+}
+
+function ThemedStatusBar() {
+  // Edge-to-edge status bar: translucent so every screen draws under it and
+  // pads via useSafeAreaInsets; icon contrast follows the active theme.
+  const { mode } = useTheme();
+  return <StatusBar translucent backgroundColor="transparent" barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />;
+}
 
 export default function App() {
   React.useEffect(() => {
-    setupPushNotifications();
+    setupPushNotifications().catch(() => { /* push unavailable (Expo Go) — non-critical */ });
   }, []);
   return (
-    <SafeAreaProvider>
-      <RootProvider>
-        <AppNavigator />
-      </RootProvider>
-    </SafeAreaProvider>
+    <AppErrorBoundary>
+      <SafeAreaProvider>
+        <RootProvider>
+          <ThemedStatusBar />
+          <AppNavigator />
+        </RootProvider>
+      </SafeAreaProvider>
+    </AppErrorBoundary>
   );
 }

## Decision
The live-work/provider-app snapshot has no App entrypoint. Candidate App files exist in three distinct snapshots with different hashes; no file is copied until the candidate is reconciled against the authoritative source register and all relative imports are present.
