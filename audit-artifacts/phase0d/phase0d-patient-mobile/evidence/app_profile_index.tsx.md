# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/profile/index.tsx`
- **Member SHA-256:** `78b896329c7f52dbf8561e8c23744fc001b56344515c0d8f2326222b51ad5708`
- **Line count:** 131
- **Read range:** `1-131`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `7: import { logout } from '../../src/store/slices/authSlice';`
- `15: const MENU: { icon: IconName; label: string; route: string; color: string; badge?: string }[] = [`
- `16: { icon: 'favorite', label: 'صحتي', route: '/(tabs)/health', color: '#E11D48' },`
- `17: { icon: 'medication', label: 'أدويتي', route: '/health/medications', color: '#16A34A' },`
- `18: { icon: 'prescriptions', label: 'وصفاتي', route: '/health/prescriptions', color: '#7A6BEA' },`
- `19: { icon: 'document', label: 'تقاريري', route: '/health/reports', color: '#F0A526' },`
- `20: { icon: 'calendar', label: 'مواعيدي', route: '/consultations/appointments', color: '#0284C7' },`
- `21: { icon: 'shopping_cart', label: 'طلباتي', route: '/orders', color: '#D97706' },`
- `22: { icon: 'wallet', label: 'محفظتي', route: '/wallet/hub', color: '#059669' },`
- `23: { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },`
- `24: { icon: 'location', label: 'عناويني', route: '/profile/addresses', color: '#DB2777' },`
### backend_consumers_or_contracts
- `7: import { logout } from '../../src/store/slices/authSlice';`
- `20: { icon: 'calendar', label: 'مواعيدي', route: '/consultations/appointments', color: '#0284C7' },`
- `21: { icon: 'shopping_cart', label: 'طلباتي', route: '/orders', color: '#D97706' },`
- `22: { icon: 'wallet', label: 'محفظتي', route: '/wallet/hub', color: '#059669' },`
- `23: { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },`
- `44: apiFetch('/loyalty/account')`
### auth_ownership
- `7: import { logout } from '../../src/store/slices/authSlice';`
- `32: const handleLogout = () => {`
- `33: dispatch(logout());`
- `79: <Button label="تسجيل الدخول / إنشاء حساب" variant="primary" onPress={handleLogout} style={{ width: '100%', marginTop: 8 }}/>`
- `115: {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>}`
### state_transitions
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';`
- `39: const user = useSelector((state: any) => state.auth.user);`
- `41: const [loyaltyPoints, setLoyaltyPoints] = React.useState<number | null>(null);`
- `58: <StatusBar barStyle="light-content" />`
- `115: {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>}`
### payment_insurance_relevance
- `11: import { AppText, Card, Badge, Button, IconButton, Avatar } from '../../src/components/ui';`
- `22: { icon: 'wallet', label: 'محفظتي', route: '/wallet/hub', color: '#059669' },`
- `23: { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },`
- `89: // Guests can open everything EXCEPT insurance & family routes.`
- `91: const guestBlocked = r.includes('insurance') || r.includes('family');`
- `93: requireAuth(r.includes('insurance') ? 'insurance' : 'family');`
- `100: <Card padding={0} style={{ alignItems: 'center', paddingVertical: 16, gap: 8, overflow: 'visible' }}>`
- `110: </Card>`
- `125: profileCard: { alignItems: 'center', gap: 12 },`
### error_empty_loading_retry_cancel
- `46: .catch(() => setLoyaltyPoints(null));`
- `115: {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
