# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/index.tsx`
- **Member SHA-256:** `4045e994f47d1ed060d7a3ba9d5a994b50e6bb872d8580e504173adb15dd87e1`
- **Line count:** 236
- **Read range:** `1-236`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `14: import { logout } from "../../src/store/slices/authSlice";`
- `28: route?: string;`
- `34: { icon: "user", label: "الملف الشخصي", route: "/profile" },`
- `35: { icon: "lock", label: "الأمان", route: "/settings/security" },`
- `36: { icon: "lock", label: "الخصوصية", route: "/settings/privacy" },`
- `45: route: "/settings/notifications-settings",`
- `49: { icon: "help", label: "المساعدة", route: "/settings/support-chat" },`
- `50: { icon: "chat", label: "تواصل معنا", route: "/support/chat" },`
- `51: { icon: "document", label: "الشروط والأحكام", route: "/settings/terms" },`
- `52: { icon: "info", label: "عن التطبيق", route: "/settings/about" },`
- `54: [{ icon: "logout", label: "تسجيل الخروج", danger: true }],`
### backend_consumers_or_contracts
- `14: import { logout } from "../../src/store/slices/authSlice";`
- `45: route: "/settings/notifications-settings",`
### auth_ownership
- `14: import { logout } from "../../src/store/slices/authSlice";`
- `54: [{ icon: "logout", label: "تسجيل الخروج", danger: true }],`
- `87: // E2: was navigating to welcome WITHOUT clearing the session — tokens stayed alive`
- `88: dispatch(logout());`
### state_transitions
- `9: StatusBar,`
- `62: const [calPref, setCalPref] = React.useState<CalendarPref>(getCalendarPref());`
- `97: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `180: color={item.danger ? colors.error : colors.textPrimary}`
- `190: ? colors.errorSurface`
- `198: color={item.danger ? colors.error : colors.primary}`
### payment_insurance_relevance
- `23: import { AppText, Card, IconButton } from "../../src/components/ui";`
- `116: <Card key={gi} padding={0}>`
- `203: </Card>`
### error_empty_loading_retry_cancel
- `180: color={item.danger ? colors.error : colors.textPrimary}`
- `190: ? colors.errorSurface`
- `198: color={item.danger ? colors.error : colors.primary}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
