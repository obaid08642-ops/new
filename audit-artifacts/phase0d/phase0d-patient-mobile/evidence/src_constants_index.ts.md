# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/constants/index.ts`
- **Member SHA-256:** `6d24960799f3542110f9c350d9cb1b37a132c8c07a9fba6bce017abfc29b3ba0`
- **Line count:** 198
- **Read range:** `1-198`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `139: { id: 'emergency', nameAr: 'طوارئ', icon: 'emergency', color: '#FF3B30', route: 'emergency' },`
- `140: { id: 'pharmacy', nameAr: 'صيدلية', icon: 'medication', color: '#22C55E', route: '(tabs)/pharmacy' },`
- `141: { id: 'diagnostics', nameAr: 'تحاليل', icon: 'science', color: '#8B5CF6', route: '(tabs)/diagnostics' },`
- `142: { id: 'nursing', nameAr: 'تمريض', icon: 'consultations', color: '#00C9A7', route: '(tabs)/nursing' },`
- `143: { id: 'mental_health', nameAr: 'صحة نفسية', icon: 'brain', color: '#6366F1', route: 'mental-health' },`
- `144: { id: 'nutrition', nameAr: 'تغذية', icon: 'food', color: '#22C55E', route: 'nutrition' },`
- `172: export const CANCELLATION_POLICY = [`
- `173: { hoursBeforeMin: 24, hoursBeforeMax: Infinity, refundPercent: 100, label: 'قبل 24 ساعة' },`
- `174: { hoursBeforeMin: 12, hoursBeforeMax: 24, refundPercent: 50, label: 'قبل 12 ساعة' },`
- `175: { hoursBeforeMin: 0, hoursBeforeMax: 12, refundPercent: 0, label: 'قبل 6 ساعات' },`
### backend_consumers_or_contracts
- `7: ?? (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1` : 'https://api.nabd.plus/api/v1');`
- `8: export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://api.nabd.plus';`
- `140: { id: 'pharmacy', nameAr: 'صيدلية', icon: 'medication', color: '#22C55E', route: '(tabs)/pharmacy' },`
- `142: { id: 'nursing', nameAr: 'تمريض', icon: 'consultations', color: '#00C9A7', route: '(tabs)/nursing' },`
### auth_ownership
- `14: AUTH_TOKEN: '@nabdah_auth_token',`
- `15: REFRESH_TOKEN: '@nabdah_refresh_token',`
### state_transitions
- `172: export const CANCELLATION_POLICY = [`
- `173: { hoursBeforeMin: 24, hoursBeforeMax: Infinity, refundPercent: 100, label: 'قبل 24 ساعة' },`
- `174: { hoursBeforeMin: 12, hoursBeforeMax: 24, refundPercent: 50, label: 'قبل 12 ساعة' },`
- `175: { hoursBeforeMin: 0, hoursBeforeMax: 12, refundPercent: 0, label: 'قبل 6 ساعات' },`
### payment_insurance_relevance
- `30: { id: '4', nameAr: 'قلب وأوعية', nameEn: 'Cardiology', icon: 'monitor_heart', color: '#EF4444' },`
- `59: { id: '33', nameAr: 'جراحة قلب', nameEn: 'Cardiac Surgery', icon: 'monitor_heart', color: '#BE123C' },`
- `91: { id: '1', nameAr: 'ضرب إبر', icon: 'bandage', basePrice: 50 },`
- `92: { id: '2', nameAr: 'غيار جروح', icon: 'bandaid', basePrice: 80 },`
- `93: { id: '3', nameAr: 'تركيب كانيولا ومحاليل', icon: 'water', basePrice: 120 },`
- `94: { id: '4', nameAr: 'رعاية كبار سن', icon: 'user', basePrice: 150 },`
- `95: { id: '5', nameAr: 'سحب دم للتحاليل', icon: 'bloodtype', basePrice: 60 },`
- `96: { id: '6', nameAr: 'إعطاء الأدوية', icon: 'medication', basePrice: 40 },`
- `97: { id: '7', nameAr: 'مراقبة علامات حيوية', icon: 'pulse', basePrice: 100 },`
- `98: { id: '8', nameAr: 'علاج تنفسي', icon: 'lungs', basePrice: 130 },`
- `99: { id: '9', nameAr: 'تركيب قسطرة بولية', icon: 'syringe', basePrice: 140 },`
- `100: { id: '10', nameAr: 'رعاية ما بعد العمليات', icon: 'vital_signs', basePrice: 200 },`
### error_empty_loading_retry_cancel
- `172: export const CANCELLATION_POLICY = [`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
