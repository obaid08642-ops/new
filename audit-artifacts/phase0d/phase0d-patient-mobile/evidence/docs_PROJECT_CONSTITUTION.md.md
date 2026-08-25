# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PROJECT_CONSTITUTION.md`
- **Member SHA-256:** `9c0011cae809c10c42a4363f72e03e7a6578d755bd57d7acd28adbe063b18ea0`
- **Line count:** 2235
- **Read range:** `1-2235`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `380: screenWidth: number;`
- `381: screenHeight: number;`
- `502: By App Version | By Screen Size | By Network | By Dark Mode`
- `572: | 'tour.force_replay'     | 'tour.draft.create'     | 'tour.draft.submit'`
- `637: | Max Width | `min(screenWidth - 32, 360)` | Computed |`
- `811: | Split Screen | ✅ Best Effort | |`
- `827: | Accessibility | Screen readers + manual | A11y compliance |`
- `835: | Deep Links | All CTA routes | Navigation correctness |`
- `934: static registerRenderer(`
- `985: | 'center_screen'  // عرض الـ Tooltip في المنتصف بدون Spotlight`
- `986: | 'retry';         // أعد المحاولة بعد 500ms`
- `1016: pageX: number, pageY: number) => {`
### backend_consumers_or_contracts
- `450: // GET /api/v1/tours/config`
- `461: // GET /api/v1/tours/{tourId}/content?locale={locale}`
- `474: // POST /api/v1/tours/analytics/events`
- `1365: ✅ Right to erasure: DELETE /api/v1/analytics/user/{userId_hash}`
- `1366: ✅ Data portability: GET /api/v1/analytics/export/{userId_hash}`
- `1376: // 2. Backend: DELETE /api/v1/analytics/user/{userId_hash}`
- `1405: path: string;        // "/(tabs)/pharmacy"`
- `1427: // Format: nabdahplus://pharmacy?scan=true`
- `1428: // أو: https://nabdahplus.com/tour-cta/pharmacy-scan`
- `1461: Path: [/(tabs)/pharmacy         ]`
- `1550: // يُستمع لـ updates فورية عبر WebSocket (اختياري في Phase 3)`
- `1551: subscribeToUpdates(callback: (config: PlatformRemoteConfig) => void): void {`
### auth_ownership
- `20: 5. [Admin Dashboard](#5-admin-dashboard)`
- `62: الجولة تستخدم Design Tokens التطبيق حصراً.`
- `201: │  │                    Admin Dashboard                               │  │`
- `371: sessionId: string;`
- `494: ## 5. Admin Dashboard`
- `521: All Admin Actions | Old→New | Export`
- `557: adminId: string;`
- `558: adminEmail: string;`
- `664: // Animation Tokens من الثيم`
- `1116: │  Draft   │ ← Admin يُنشئ أو يُعدّل`
- `1120: │  Review  │ ← Admin آخر يراجع`
- `1138: - Draft → Review: يتطلب admin ثانٍ (Reviewer role)`
### state_transitions
- `102: | Empty State Guides | إرشاد عند خلو الشاشة | 2 |`
- `166: ### 2.6 Cooldown Success Celebration`
- `294: type TourStatus =`
- `295: | 'idle' | 'loading' | 'starting' | 'active'`
- `297: | 'completed' | 'skipped' | 'error' | 'recovering';`
- `334: status: 'completed' | 'skipped' | 'in_progress' | 'skip_all';`
- `335: completedSteps: string[];`
- `340: completedAt?: string;`
- `534: │  │ Started  │ │Completed │ │ Avg Time │ │  Top Drop-off        │  │`
- `565: status: 'success' | 'failed' | 'partial';`
- `642: ### 7.6 Success Celebration`
- `646: نبضة خضراء واحدة (colors.success) + checkmark SVG`
### payment_insurance_relevance
- `104: | Educational Cards | بطاقات تعليمية | 3 |`
- `836: | Push During Tour | Mocked push payload | Interruption handling |`
- `1984: □ Unit Tests: coverage ≥ 80% للوحدات الجديدة`
### error_empty_loading_retry_cancel
- `76: RULE 07 — Offline Graceful Degradation`
- `102: | Empty State Guides | إرشاد عند خلو الشاشة | 2 |`
- `295: | 'idle' | 'loading' | 'starting' | 'active'`
- `297: | 'completed' | 'skipped' | 'error' | 'recovering';`
- `318: Priority 1: Remote CMS (timeout: 3000ms)`
- `353: // Offline: AsyncStorage حتى عودة الاتصال`
- `385: networkType: 'wifi' | 'cellular' | 'offline';`
- `488: Offline:        أي Cache متاح مهما قدم`
- `565: status: 'success' | 'failed' | 'partial';`
- `830: | Offline | Mocked network | Graceful degradation |`
- `894: } catch {`
- `931: throw new Error('No supported renderer found');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
