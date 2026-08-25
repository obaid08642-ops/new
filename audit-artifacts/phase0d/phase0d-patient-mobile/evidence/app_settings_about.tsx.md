# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/about.tsx`
- **Member SHA-256:** `1330ae41b08a18f7d8503249f8e572209b5104c9ebfb55d8c6b1651f344db403`
- **Line count:** 398
- **Read range:** `1-398`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `54: export default function AboutScreen() {`
- `78: <IconButton icon="back" onPress={() => router.back()} />`
- `136: onPress={() => handleOpenLink(link.url)}`
- `221: onPress={() => router.push("/settings/terms")}`
- `238: onPress={() => router.push("/settings/privacy")}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `42: role: "تطوير التطبيق والبنية التحتية",`
- `45: { name: "فريق المنتج", role: "التصميم وتجربة المستخدم", icon: "sparkles" },`
- `48: role: "المراجعة والاستشارات الطبية",`
- `51: { name: "فريق الدعم", role: "خدمة العملاء على مدار الساعة", icon: "chat" },`
- `210: {member.role}`
### state_transitions
- `7: StatusBar,`
- `64: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `265: <Icon name="favorite" size={16} color={colors.error} />`
### payment_insurance_relevance
- `16: import { AppText, Card, IconButton } from "../../src/components/ui";`
- `113: <Card style={styles.descriptionCard}>`
- `125: </Card>`
- `132: <Card>`
- `170: </Card>`
- `182: style={styles.teamCardWrap}`
- `184: <Card style={styles.teamCard}>`
- `212: </Card>`
- `219: <Card style={styles.legalCard}>`
- `251: </Card>`
- `320: descriptionCard: {`
- `351: teamCardWrap: {`
### error_empty_loading_retry_cancel
- `59: Linking.openURL(url).catch(() => {});`
- `265: <Icon name="favorite" size={16} color={colors.error} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
