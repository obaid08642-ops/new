# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/reports/passport.tsx`
- **Member SHA-256:** `c2c95e9dbf2ddbf6b88127c89aee1f01b6b79f63d60c27e684c0a720b955de18`
- **Line count:** 329
- **Read range:** `1-329`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { useRouter } from "expo-router";`
- `30: export default function HealthPassportScreen() {`
- `31: const router = useRouter();`
- `72: <IconButton icon="back" onPress={() => router.back()} />`
- `79: <IconButton icon="share" onPress={handleSharePassport} />`
- `250: onPress={() =>`
### backend_consumers_or_contracts
- `38: apiFetch('/medical-profile').then(res => setProfile(res)).catch(() => {});`
- `39: apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
### auth_ownership
- `35: const [passportToken, setPassportToken] = React.useState<any>(null);`
- `39: apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
- `99: {/* QR contains only a short-lived opaque backend token, never medical data. */}`
- `102: {passportToken?.token ? (`
- `105: t: passportToken.format,`
- `106: v: passportToken.version,`
- `107: token: passportToken.token,`
- `120: label={passportToken?.expires_at ? `رمز مؤقت حتى ${new Date(passportToken.expires_at).toLocaleTimeString()}` : 'يتطلب اتصالاً آمناً'}`
### state_transitions
- `9: StatusBar,`
- `34: const [profile, setProfile] = React.useState<any>(null);`
- `35: const [passportToken, setPassportToken] = React.useState<any>(null);`
- `52: } catch (error) {`
- `53: console.error(error);`
- `59: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `121: color={colors.success}`
- `137: <AppText variant="h3" color={colors.error}>`
- `199: <Icon name="medication" size={20} color={colors.success} />`
- `218: <Badge label="مستمر" color={colors.success} />`
- `240: <Icon name="emergency" size={20} color={colors.error} />`
- `265: <Icon name="call" size={20} color={colors.error} />`
### payment_insurance_relevance
- `19: Card,`
- `90: {/* QR Code Card */}`
- `91: <Card style={st.qrCard}>`
- `124: </Card>`
- `126: {/* General Info Card */}`
- `127: <Card style={st.infoGrid}>`
- `162: </Card>`
- `164: {/* Allergies Card */}`
- `165: <Card>`
- `187: </Card>`
- `190: <Card>`
- `228: </Card>`
### error_empty_loading_retry_cancel
- `38: apiFetch('/medical-profile').then(res => setProfile(res)).catch(() => {});`
- `39: apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
- `52: } catch (error) {`
- `53: console.error(error);`
- `137: <AppText variant="h3" color={colors.error}>`
- `240: <Icon name="emergency" size={20} color={colors.error} />`
- `265: <Icon name="call" size={20} color={colors.error} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
