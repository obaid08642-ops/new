# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/services/index.tsx`
- **Member SHA-256:** `1666c84c16682a096130eebef871ed7ed92c083bfd568203ab5b54989070a5bf`
- **Line count:** 124
- **Read range:** `1-124`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { useRouter } from 'expo-router';`
- `15: route: string;`
- `22: { title: 'استشارات الأطباء', desc: 'عيادة، فيديو، أو زيارة منزلية', icon: 'stethoscope', route: '/(tabs)/consultations' },`
- `23: { title: 'التحاليل المخبرية', desc: 'سحب عينة منزلي أو زيارة المختبر', icon: 'science', route: '/(tabs)/diagnostics' },`
- `24: { title: 'الأشعة والتصوير', desc: 'حجز مواعيد الأشعة', icon: 'radiology-box-outline', route: '/(tabs)/diagnostics' },`
- `25: { title: 'التمريض المنزلي', desc: 'رعاية تمريضية في منزلك', icon: 'nurse', route: '/(tabs)/nursing' },`
- `26: { title: 'الإسعاف', desc: 'طلب إسعاف طارئ فوري', icon: 'ambulance', route: '/emergency/sos' },`
- `27: { title: 'الصيدلية', desc: 'أدوية ومنتجات صحية بتوصيل سريع', icon: 'prescriptions', route: '/(tabs)/pharmacy' },`
- `33: { title: 'الملف الصحي', desc: 'علاماتك الحيوية وسجلك الطبي', icon: 'health', route: '/(tabs)/health' },`
- `34: { title: 'التذكيرات الذكية', desc: 'تذكيرات الأدوية والمواعيد', icon: 'notification', route: '/health/smart-reminders' },`
- `35: { title: 'التقارير الطبية', desc: 'تقاريرك ونتائجك في مكان واحد', icon: 'document', route: '/reports/view-report' },`
- `41: { title: 'المساعد الطبي الذكي', desc: 'فرز الأعراض وإرشاد أولي', icon: 'robot', route: '/ai/symptom-checker' },`
### backend_consumers_or_contracts
- `25: { title: 'التمريض المنزلي', desc: 'رعاية تمريضية في منزلك', icon: 'nurse', route: '/(tabs)/nursing' },`
- `27: { title: 'الصيدلية', desc: 'أدوية ومنتجات صحية بتوصيل سريع', icon: 'prescriptions', route: '/(tabs)/pharmacy' },`
- `59: { title: 'مركز الطلبات', desc: 'كل طلباتك وحجوزاتك في مكان واحد', icon: 'receipt', route: '/orders' },`
- `60: { title: 'التأمين الطبي', desc: 'وثيقتك وتغطيتك التأمينية', icon: 'shield', route: '/insurance' },`
- `61: { title: 'المحفظة', desc: 'رصيدك ومعاملاتك المالية', icon: 'wallet', route: '/wallet/hub' },`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';`
- `76: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton, SectionHeader } from '../../src/components/ui';`
- `60: { title: 'التأمين الطبي', desc: 'وثيقتك وتغطيتك التأمينية', icon: 'shield', route: '/insurance' },`
- `61: { title: 'المحفظة', desc: 'رصيدك ومعاملاتك المالية', icon: 'wallet', route: '/wallet/hub' },`
- `63: { title: 'العروض والباقات', desc: 'خصومات وباقات صحية', icon: 'tag', route: '/offers' },`
- `87: <Card style={{ paddingVertical: 4 }}>`
- `108: </Card>`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
