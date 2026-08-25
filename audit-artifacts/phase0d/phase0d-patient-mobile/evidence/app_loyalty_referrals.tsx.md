# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/loyalty/referrals.tsx`
- **Member SHA-256:** `2ff46639a54bd3c7893368414cdc1e41a31a8f860661cdc0ae5fc5aaf4bed20f`
- **Line count:** 322
- **Read range:** `1-322`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { useRouter } from "expo-router";`
- `32: registered: { label: "تم التسجيل — في انتظار أول حجز", reward: "+100 نقطة معلقة", done: false },`
- `36: export default function ReferralsScreen() {`
- `37: const router = useRouter();`
- `44: const [stats, setStats] = useState({ total: 0, registered: 0, rewarded: 0, earned_points: 0 });`
- `55: setStats(res.stats || { total: 0, registered: 0, rewarded: 0, earned_points: 0 });`
- `112: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
- `132: <IconButton icon="back" onPress={() => router.back()} />`
- `141: onPress={() =>`
- `199: <Button label="نسخ الكود" variant="outline" icon="content-copy" onPress={handleCopyCode} style={{ flex: 1 }} />`
- `200: <Button label="مشاركة الكود" variant="primary" icon="share" onPress={handleShare} style={{ flex: 1.2 }} />`
- `219: onPress={handleApply}`
### backend_consumers_or_contracts
- `53: const res = await apiFetch("/referrals/my");`
- `86: await apiFetch("/referrals/apply", {`
### auth_ownership
- `112: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from "react";`
- `11: StatusBar,`
- `31: const STATUS_META: Record<string, { label: string; reward: string; done: boolean }> = {`
- `41: const [loading, setLoading] = useState(true);`
- `42: const [error, setError] = useState<string | null>(null);`
- `43: const [code, setCode] = useState("");`
- `44: const [stats, setStats] = useState({ total: 0, registered: 0, rewarded: 0, earned_points: 0 });`
- `45: const [invites, setInvites] = useState<any[]>([]);`
- `46: const [applyCode, setApplyCode] = useState("");`
- `47: const [applying, setApplying] = useState(false);`
- `51: setLoading(true);`
- `52: setError(null);`
### payment_insurance_relevance
- `20: Card,`
- `44: const [stats, setStats] = useState({ total: 0, registered: 0, rewarded: 0, earned_points: 0 });`
- `55: setStats(res.stats || { total: 0, registered: 0, rewarded: 0, earned_points: 0 });`
- `158: {/* Banner Card */}`
- `159: <Card`
- `161: st.bannerCard,`
- `180: </Card>`
- `183: <Card style={st.codeCard}>`
- `202: </Card>`
- `205: <Card style={{ gap: 10 }}>`
- `224: </Card>`
- `228: <Card style={st.statCard}>`
### error_empty_loading_retry_cancel
- `41: const [loading, setLoading] = useState(true);`
- `42: const [error, setError] = useState<string | null>(null);`
- `51: setLoading(true);`
- `52: setError(null);`
- `57: } catch (e: any) {`
- `58: setError(e?.message || "تعذر تحميل بيانات الإحالة");`
- `60: setLoading(false);`
- `78: } catch {}`
- `92: } catch (e: any) {`
- `99: if (loading) {`
- `107: if (error) {`
- `111: <AppText variant="bodyMD" color={colors.textSecondary} align="center">{error}</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
