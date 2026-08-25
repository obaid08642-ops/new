# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `App.tsx`
- **Member SHA-256:** `5f8e91e4705d4ff0f36b21bc92c0013bfff055f612c82ac27b9553dc6f8ebb9f`
- **Line count:** 116
- **Read range:** `1-116`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `17: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `18: import { DoctorRegistration }         from './src/screens/doctor/DoctorRegistration';`
- `19: import { DoctorDashboardNavigator }   from './src/screens/doctor/DoctorDashboard';`
- `20: import { FacilityRegistration }       from './src/screens/facility/FacilityRegistration';`
- `21: import { FacilityDashboardNavigator } from './src/screens/facility/FacilityDashboard';`
- `22: import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';`
- `23: import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';`
- `24: import { LabRegistration }           from './src/screens/lab/LabRegistration';`
- `25: import { LabDashboardNavigator }     from './src/screens/lab/LabDashboard';`
- `26: import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';`
- `27: import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';`
### backend_consumers_or_contracts
- `4: * Phase 0-5: Doctor + Facility + Pharmacy + Lab/Radiology + Nursing`
- `16: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `17: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `22: import { PharmacyRegistration }       from './src/screens/pharmacy/PharmacyRegistration';`
- `23: import { PharmacyDashboardNavigator } from './src/screens/pharmacy/PharmacyDashboard';`
- `26: import { RadiologyRegistration }     from './src/screens/radiology/RadiologyRegistration';`
- `27: import { RadiologyDashboardNavigator } from './src/screens/radiology/RadiologyDashboard';`
- `28: import { NursingRegistration }       from './src/screens/nursing/NursingRegistration';`
- `29: import { NursingDashboardNavigator } from './src/screens/nursing/NursingDashboard';`
- `103: import { PharmacyChatResponder } from "./src/screens/shared/PharmacyChatResponder";`
### auth_ownership
- `15: import { RootProvider, useAuth, useTheme } from './src/context';`
- `16: import { SplashScreen, WelcomeScreen, LoginScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';`
- `38: const { isLoggedIn, user, logout, appState } = useAuth();`
- `53: const doLogout = async () => { await logout(); };`
- `54: if (t === 'doctor')   return <DoctorDashboardNavigator   onLogout={doLogout} />;`
- `55: if (t === 'facility' || t === 'hospital') return <FacilityDashboardNavigator onLogout={doLogout} />;`
- `56: if (t === 'pharmacy' || t === 'pharmacist') return <PharmacyDashboardNavigator onLogout={doLogout} />;`
- `57: if (t === 'lab') return <LabDashboardNavigator onLogout={doLogout} />;`
- `58: if (t === 'radiology') return <RadiologyDashboardNavigator onLogout={doLogout} />;`
- `59: if (t === 'nursing' || t === 'nurse' || t === 'home_care')  return <NursingDashboardNavigator  onLogout={doLogout} />;`
- `60: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `66: {({ navigation }) => <WelcomeScreen onSelectType={t => { setPType(t); navigation.navigate('Register'); }} onLogin={() => navigation.navigate('Login')} onGuestJobs={() => navigation.navigate('GuestJobs')} onGuestDrugIndex={() => navigation.n`
### state_transitions
- `6: import React, { useState, useCallback, useEffect } from 'react';`
- `17: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `38: const { isLoggedIn, user, logout, appState } = useAuth();`
- `40: const [pType, setPType]   = useState('doctor');`
- `42: if (appState === 'checking') {`
- `49: {appState === 'logged_in' ? (`
- `60: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `69: {({ navigation }) => <LoginScreen onSuccess={() => {}} onBack={() => navigation.goBack()} onForgot={() => navigation.navigate('Forgot')} onRegister={() => navigation.navigate('Welcome')} />}`
- `72: {({ navigation }) => <ForgotPasswordScreen onBack={() => navigation.goBack()} onSuccess={() => navigation.goBack()} />}`
- `76: if (pType === 'doctor')   return <DoctorRegistration   onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `77: if (pType === 'facility') return <FacilityRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `78: if (pType === 'pharmacy') return <PharmacyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: import { PendingDashboard } from './src/screens/auth/PendingDashboard';`
- `60: return <PendingDashboard providerType={t} onExplore={() => {}} onLogout={doLogout} />;`
- `76: if (pType === 'doctor')   return <DoctorRegistration   onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `77: if (pType === 'facility') return <FacilityRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `78: if (pType === 'pharmacy') return <PharmacyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `79: if (pType === 'lab') return <LabRegistration providerType={pType} onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `80: if (pType === 'radiology') return <RadiologyRegistration onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `81: if (pType === 'nursing')  return <NursingRegistration  onBack={() => navigation.goBack()} onDone={() => navigation.navigate('Pending')} />;`
- `82: return <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.goBack()} />;`
- `85: <Stack.Screen name="Pending">`
- `86: {({ navigation }) => <PendingDashboard providerType={pType} onExplore={() => {}} onLogout={() => navigation.navigate('Welcome')} />}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
