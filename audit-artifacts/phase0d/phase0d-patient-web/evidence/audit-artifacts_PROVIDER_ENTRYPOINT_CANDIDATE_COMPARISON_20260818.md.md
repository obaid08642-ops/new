# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_ENTRYPOINT_CANDIDATE_COMPARISON_20260818.md`
- **Member SHA-256:** `9d3345965679f950051d2b1dd508d89ae293ab051688b0c60fad4aff7c2290ad`
- **Line count:** 153
- **Read range:** `1-153`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `12: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `13: -import { DoctorRegistration }         from './src/screens/doctor/DoctorRegistration';`
- `14: -import { DoctorDashboardNavigator }   from './src/screens/doctor/DoctorDashboard';`
- `15: -import { FacilityRegistration }       from './src/screens/facility/FacilityRegistration';`
- `16: -import { FacilityDashboardNavigator } from './src/screens/facility/FacilityDashboard';`
- `17: -import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';`
- `18: -import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';`
- `19: -import { LabRegistration }           from './src/screens/lab/LabRegistration';`
- `20: -import { LabDashboardNavigator }     from './src/screens/lab/LabDashboard';`
- `21: -import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';`
- `22: -import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';`
### backend_consumers_or_contracts
- `11: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `12: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `17: -import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';`
- `18: -import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';`
- `21: -import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';`
- `22: -import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';`
- `23: -import { NursingRegistration }       from './src/screens/nursing/NursingRegistration';`
- `24: -import { NursingDashboardNavigator } from './src/screens/nursing/NursingDashboard';`
- `65: +const PharmacyRegistration        = lazyScreen(() => require('./src/screens/pharmacy/PharmacyRegistration').PharmacyRegistration, 'PharmacyRegistration');`
- `66: +const PharmacyDashboardNavigator  = lazyScreen(() => require('./src/screens/pharmacy/PharmacyDashboard').PharmacyDashboardNavigator, 'PharmacyDashboard');`
- `69: +const RadiologyRegistration       = lazyScreen(() => require('./src/screens/radiology/RadiologyRegistration').RadiologyRegistration, 'RadiologyRegistration');`
- `70: +const RadiologyDashboardNavigator = lazyScreen(() => require('./src/screens/radiology/RadiologyDashboard').RadiologyDashboardNavigator, 'RadiologyDashboard');`
### auth_ownership
- `10: import { RootProvider, useAuth, useTheme } from './src/context';`
- `11: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `81: if (t === 'lab') return <LabDashboardNavigator onLogout={doLogout} />;`
- `82: if (t === 'radiology') return <RadiologyDashboardNavigator onLogout={doLogout} />;`
- `83: if (t === 'nursing' || t === 'nurse' || t === 'home_care')  return <NursingDashboardNavigator  onLogout={doLogout} />;`
- `84: +              if (t === 'ambulance' || t === 'emergency' || t === 'driver' || t === 'delivery') return <AmbulanceDashboardNavigator onLogout={doLogout} />;`
- `85: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `93: return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;`
- `137: -      <RootProvider>`
- `139: -      </RootProvider>`
- `143: +        <RootProvider>`
- `146: +        </RootProvider>`
### state_transitions
- `12: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `32: +// require()d on first render; a failing screen shows an isolated error instead`
- `34: +import { View, Text, TouchableOpacity, StatusBar } from 'react-native';`
- `44: +      catch (e: any) { console.error(`[LazyScreen] Failed to load ${label}:`, e?.message || e); cached = null; }`
- `85: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `89: if (pType === 'lab') return <LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `90: if (pType === 'radiology') return <RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `91: if (pType === 'nursing')  return <NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `92: +                if (pType === 'ambulance') return <AmbulanceRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `93: return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;`
- `104: +class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {`
- `105: +  state = { error: null as string | null };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `12: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `30: +// expo-camera / maps in Expo Go) aborted the whole bundle evaluation and the`
- `32: +// require()d on first render; a failing screen shows an isolated error instead`
- `44: +      catch (e: any) { console.error(`[LazyScreen] Failed to load ${label}:`, e?.message || e); cached = null; }`
- `85: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `89: if (pType === 'lab') return <LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `90: if (pType === 'radiology') return <RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `91: if (pType === 'nursing')  return <NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `92: +                if (pType === 'ambulance') return <AmbulanceRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `93: return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;`
- `104: +class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {`
- `105: +  state = { error: null as string | null };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
