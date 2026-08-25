# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/_layout.tsx`
- **Member SHA-256:** `ad6c5921c8aab3b65cbeca000485620eeda1733ce9dc004190f526b5924eabaa`
- **Line count:** 114
- **Read range:** `1-114`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { Stack } from 'expo-router';`
- `14: import * as SplashScreen from 'expo-splash-screen';`
- `34: SplashScreen.preventAutoHideAsync();`
- `54: SplashScreen.hideAsync();`
- `59: bgSync.registerBackgroundFetch();`
- `78: screenOptions={{ headerShown: false }}`
- `80: <Stack.Screen name="index" />`
- `81: <Stack.Screen name="(onboarding)" />`
- `82: <Stack.Screen name="(auth)" />`
- `83: <Stack.Screen name="(tabs)" />`
- `84: <Stack.Screen name="room/[id]" />`
- `85: <Stack.Screen name="ai-assistant" />`
### backend_consumers_or_contracts
- `18: import { SocketProvider } from '../src/context/SocketContext';`
- `59: bgSync.registerBackgroundFetch();`
- `68: <SocketProvider>`
- `93: </SocketProvider>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: import { StatusBar } from 'expo-status-bar';`
- `36: function ThemedStatusBar() {`
- `38: return <StatusBar style={isDark ? 'light' : 'dark'} />;`
- `42: const [loaded, error] = useFonts({`
- `53: if (loaded || error) {`
- `61: }, [loaded, error]);`
- `63: if (!loaded && !error) return null;`
- `74: <ThemedStatusBar />`
- `109: console.warn('[Sentry] Failed to wrap root component with Sentry:', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `23: import OfflineBanner from '../src/components/OfflineBanner';`
- `42: const [loaded, error] = useFonts({`
- `53: if (loaded || error) {`
- `61: }, [loaded, error]);`
- `63: if (!loaded && !error) return null;`
- `76: <OfflineBanner />`
- `108: } catch (e) {`
- `109: console.warn('[Sentry] Failed to wrap root component with Sentry:', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
