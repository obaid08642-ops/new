# Phase 0 v3 — FINAL · Product Discovery Platform
### نبض بلس · Single Source of Truth · معتمدة للتنفيذ

---

> **حالة الوثيقة:** ✅ معتمدة نهائياً — جاهزة للتنفيذ
> **النسخة:** 3.0.0
> **تاريخ الاعتماد:** 2026-07-13
> **لا تُعدَّل هذه الوثيقة أثناء التنفيذ إلا عند وجود سبب تقني واضح وموثّق في ADR**

---

## جدول المحتويات

**الجزء الأول — المُعتمَد بدون تغيير**
1. [مبادئ المنصة](#1-مبادئ-المنصة)
2. [UX Audit المحسّن](#2-ux-audit-المحسّن)
3. [System Architecture — الـ 8 Modules](#3-system-architecture)
4. [Remote Content Management + CMS](#4-remote-content-management)
5. [Admin Dashboard](#5-admin-dashboard)
6. [Audit Logs](#6-audit-logs)
7. [Design Concept C](#7-design-system)
8. [Motion Design](#8-motion-design)
9. [Multi-Language & i18n](#9-multi-language--i18n)
10. [Accessibility](#10-accessibility)
11. [Performance Budget](#11-performance-budget)
12. [Compatibility Matrix](#12-compatibility-matrix)
13. [Testing Plan](#13-testing-plan)

**الجزء الثاني — الإضافات المعمارية الجديدة**

14. [Pluggable Renderer Interface](#14-pluggable-renderer-interface)
15. [Target Resolver Layer](#15-target-resolver-layer)
16. [Multi-Layer Versioning](#16-multi-layer-versioning)
17. [CMS Draft / Publish Workflow](#17-cms-draft--publish-workflow)
18. [Feature Flags System](#18-feature-flags-system)
19. [Privacy & Consent](#19-privacy--consent)
20. [Deep Links System](#20-deep-links-system)
21. [Remote Configuration](#21-remote-configuration)
22. [Crash Safety & Recovery](#22-crash-safety--recovery)
23. [Dependency Injection](#23-dependency-injection)
24. [Architecture Decision Records (ADR)](#24-architecture-decision-records)
25. [Definition of Done — Enhanced](#25-definition-of-done--enhanced)
26. [Phased Implementation](#26-phased-implementation)
27. [Risks & Final Recommendation](#27-risks--final-recommendation)

---

# الجزء الأول — المُعتمَد بدون تغيير

---

## 1. مبادئ المنصة

### 1.1 القواعد غير القابلة للكسر

```
RULE 01 — No Hardcoded Text
  أي نص يظهر للمستخدم يأتي من i18n أو CMS. لا استثناءات.

RULE 02 — No Separate Design
  الجولة تستخدم Design Tokens التطبيق حصراً.

RULE 03 — No Emojis / No Icons Outside Design System
  كل الأيقونات Vector SVG أو من نظام الأيقونات الرسمي.

RULE 04 — No Implementation Before Approval
  لا كود قبل اعتماد الوثيقة. معتمدة الآن.

RULE 05 — No Regression
  كل Phase مكتمل + Tested + Reviewed قبل التالي.

RULE 06 — Performance First
  أي مكون لا يعمل ضمن الـ Performance Budget لا يُنفَّذ.

RULE 07 — Offline Graceful Degradation
  CMS → Cache → Static. لا توقف كامل عند انقطاع الاتصال.

RULE 08 — No Direct Dependencies
  كل الخدمات تُستدعى عبر Interfaces. لا hard coupling.
  (تفصيل في المادة 23 — Dependency Injection)

RULE 09 — Privacy by Default
  لا PII في الـ Analytics. الـ Consent يُعطّل Analytics بالكامل.
  (تفصيل في المادة 19 — Privacy)

RULE 10 — Every Decision Documented
  أي قرار معماري كبير يُسجَّل في docs/adr/.
  (تفصيل في المادة 24 — ADR)
```

### 1.2 تعريف المنصة

**Product Discovery Platform** — ليست مجرد Guided Tour Component.

| النمط | الوصف | Phase |
|-------|-------|-------|
| Guided Tours | جولات خطوة بخطوة بـ Spotlight | 1 |
| Contextual Tips | تلميحات سياقية خفيفة | 1 |
| What's New | إعلانات الميزات الجديدة | 2 |
| Feature Badges | نقطة على الميزة الجديدة | 2 |
| Empty State Guides | إرشاد عند خلو الشاشة | 2 |
| Inline Help | شرح مضمّن داخل الشاشة | 3 |
| Educational Cards | بطاقات تعليمية | 3 |
| AI-Personalized Hints | تلميحات بناءً على السلوك | 4 |

---

## 2. UX Audit المحسّن

### 2.1 مبادئ Progressive Disclosure

**ثلاثة مستويات:**

```
Level 1 — Passive Hints
  أيقونة دائرة (?) بجانب العناصر الغامضة
  تظهر أول 7 أيام ثم تختفي تدريجياً

Level 2 — Contextual Tooltips
  عند أول تفاعل مع عنصر جديد
  تختفي بعد 4 ثوانٍ أو عند الضغط خارجها

Level 3 — Full Guided Tour
  جولة كاملة بـ Spotlight
  مرة واحدة ما لم تُعَد يدوياً أو بـ Version Bump
```

### 2.2 Interactive Steps

```
Passive     → يقرأ ويضغط Next
Interactive → ينفّذ الإجراء (الجولة تنتظر)
Confirmation → "ممتاز! الخطوة التالية"
```

### 2.3 Resume Tour

```
عند إعادة الفتح خلال 48 ساعة:
"تريد تكمل من حيث توقفت؟ (الخطوة 2 من 4)"
[متابعة]  [من البداية]  [تخطَّ الجولة]
```

### 2.4 Smart Skip — ثلاثة مستويات

```
[تخطَّ هذه الخطوة]  → يكمل باقي الجولة
[تخطَّ هذه الجولة] → يلغي الجولة الحالية
[تخطَّ كل الجولات] → تأكيد → يُلغي بالكامل
```

### 2.5 Cooldown Strategy

| السيناريو | القاعدة |
|-----------|---------|
| اليوم الأول | جولة الرئيسية فقط |
| اليوم 2-3 | جولة واحدة لكل وحدة جديدة |
| بعد 7 أيام | لا قيود |
| بين الجولات | 30 دقيقة كحد أدنى |
| بعد تحديث | What's New فقط |
| بعد Skip | لا تُعيد في نفس الجلسة |

**ملاحظة:** كل هذه القيم متاحة عبر Remote Config (المادة 21).

### 2.6 Cooldown Success Celebration

```
بعد إكمال الجولة:
نبضة خضراء خفيفة → رسالة → CTA للتفاعل الأول
يختفي بعد 3 ثوانٍ أو عند الضغط
```

### 2.7 الجولات المقررة

| # | الوحدة | الخطوات | الأولوية |
|---|--------|---------|---------|
| 1 | الرئيسية | 4 | أولى |
| 2 | الصيدلية | 3 | ثانية |
| 3 | الاستشارات | 4 | ثانية |
| 4 | التحاليل | 3 | ثانية |
| 5 | التمريض | 3 | ثانية |
| 6 | الملف الصحي | 3 | ثالثة |
| 7 | تذكير الدواء | 3 | ثالثة |
| 8 | الأمومة | 3 | ثانية |
| 9 | التغذية | 3 | ثالثة |
| 10 | الصحة النفسية | 3 | ثالثة |
| 11 | الخريطة | 2 | رابعة |

---

## 3. System Architecture

### 3.1 نظرة عامة

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Nabdah Product Discovery Platform v3                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Admin Dashboard                               │  │
│  │  Content | Analytics | Audit Logs | Feature Flags | Remote Config│  │
│  └────────────────────────┬─────────────────────────────────────────┘  │
│                           │ REST API                                    │
│  ┌────────────────────────▼─────────────────────────────────────────┐  │
│  │                   Backend Services                               │  │
│  │  TourCMS | Analytics | AuditLogger | FeatureFlags | RemoteConfig │  │
│  └────────────────────────┬─────────────────────────────────────────┘  │
│                           │                                             │
│  ┌────────────────────────▼─────────────────────────────────────────┐  │
│  │                   Mobile SDK (DI Container)                      │  │
│  │                                                                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │  Tour    │ │ Content  │ │Analytics │ │ Feature  │           │  │
│  │  │ Registry │ │ Provider │ │Collector │ │  Flags   │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │Cooldown  │ │Persist.  │ │  Crash   │ │ Remote   │           │  │
│  │  │ Manager  │ │ Manager  │ │ Recovery │ │  Config  │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │  │
│  │                           │                                     │  │
│  │              ┌────────────▼──────────┐                         │  │
│  │              │      TourContext       │                         │  │
│  │              └────────────┬──────────┘                         │  │
│  │                           │                                     │  │
│  │  ┌──────────┐ ┌───────────▼──────────┐ ┌──────────────────┐   │  │
│  │  │ useTour  │ │  SpotlightOverlay    │ │   TourTooltip    │   │  │
│  │  │  (Hook)  │ │ (Renderer Interface) │ │   (UI Layer)     │   │  │
│  │  └──────────┘ └──────────────────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 الوحدات الثماني + الإضافات المعمارية

| Module | المسؤولية | يُبنى في |
|--------|-----------|---------|
| TourRegistry | تعريفات الجولات (هيكل بدون محتوى) | Phase 1 |
| TourEngine | دورة حياة الجولة كاملة | Phase 1 |
| ContentProvider | جلب المحتوى (CMS → Cache → Static) | Phase 1 |
| PersistenceManager | حفظ حالة الجولة مرتبطاً بالمستخدم | Phase 1 |
| SpotlightRenderer | واجهة الرسم (Pluggable — المادة 14) | Phase 1 |
| AnalyticsCollector | Event Queue + Batch send | Phase 2 |
| WhatsnewEngine | إعلانات الميزات الجديدة | Phase 2 |
| CooldownManager | منطق الـ Cooldown | Phase 1 |
| **TargetResolver** | استهداف العناصر (المادة 15) | Phase 1 |
| **FeatureFlagsEngine** | تشغيل/إيقاف الأنماط (المادة 18) | Phase 1 |
| **RemoteConfigManager** | الإعدادات المركزية (المادة 21) | Phase 1 |
| **CrashRecoveryManager** | الحماية والاسترداد (المادة 22) | Phase 1 |

### 3.3 TourRegistry

```typescript
interface TourDefinition {
  id: string;                 // "home_v1"
  module: ModuleKey;
  schemaVersion: string;      // المادة 16
  contentVersion: string;
  tourVersion: string;
  appCompatVersion: string;
  minAppVersion: string;
  maxAppVersion?: string;
  platform?: 'ios' | 'android' | 'both';
  steps: TourStepDefinition[];
  trigger: TriggerConfig;
  cooldown?: CooldownRule;    // override للـ Remote Config
  interactive?: boolean;
  celebrateOnComplete?: boolean;
  priority: number;
  featureFlag?: string;       // المادة 18 — يُعطَّل إذا كان الـ flag off
}

interface TourStepDefinition {
  id: string;
  target: TargetConfig;       // المادة 15 — ليس testID فقط
  type: 'passive' | 'interactive' | 'confirmation';
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  highlight: HighlightShape;
  action?: InteractiveAction;
  skippable: boolean;
  required?: boolean;
}

interface TriggerConfig {
  on: 'module_first_visit' | 'app_first_open' | 'feature_first_use' | 'manual';
  delay?: number;
  condition?: () => boolean;
}
```

### 3.4 TourEngine

```typescript
type TourStatus =
  | 'idle' | 'loading' | 'starting' | 'active'
  | 'paused' | 'resuming' | 'celebrating'
  | 'completed' | 'skipped' | 'error' | 'recovering';

interface TourEngineActions {
  startTour(tourId: string, force?: boolean): Promise<void>;
  nextStep(): void;
  prevStep(): void;
  skipStep(): void;
  skipTour(): void;
  skipAll(): Promise<void>;
  completeTour(): Promise<void>;
  pauseTour(): void;
  resumeTour(): void;
  resetTour(tourId: string): Promise<void>;
  resetAll(): Promise<void>;
  recover(): Promise<void>;   // المادة 22 — Crash Recovery
}
```

### 3.5 ContentProvider + Fallback Chain

```
Priority 1: Remote CMS (timeout: 3000ms)
Priority 2: AsyncStorage Cache (max age: 24h, stale-while-revalidate)
Priority 3: Static Bundle (bundled JSON files)

عند فشل كل الطرق: لا تُعرض الجولة — سجّل الخطأ وأكمل بصمت
```

### 3.6 PersistenceManager

```typescript
// Key Pattern: @nabdah_tour_{tourId}_{userId_hash}
// مرتبط بالمستخدم — مختلف بين مستخدمين على نفس الجهاز

interface TourPersistenceRecord {
  tourId: string;
  userId: string;            // SHA-256
  status: 'completed' | 'skipped' | 'in_progress' | 'skip_all';
  completedSteps: string[];
  lastStep?: string;
  crashCount: number;        // المادة 22 — لمنع crash loop
  lastCrashAt?: string;
  seenAt: string;
  completedAt?: string;
  schemaVersion: string;
  contentVersion: string;
  tourVersion: string;
  appVersion: string;
  locale: string;
}
```

### 3.7 AnalyticsCollector

```typescript
// Event Queue — Batch send كل 30 ثانية أو عند تجمع 20 event
// Offline: AsyncStorage حتى عودة الاتصال
// Privacy: إذا كان consent = false → لا شيء يُرسَل (المادة 19)

interface TourAnalyticsEvent {
  eventId: string;
  eventType: TourEventType;
  tourId: string;
  stepId?: string;
  stepIndex?: number;
  durationMs?: number;
  skipType?: 'step' | 'tour' | 'all';
  metadata: AnalyticsMetadata;
  timestamp: string;
}

interface AnalyticsMetadata {
  // لا PII — SHA-256 فقط
  userId: string;
  sessionId: string;
  appVersion: string;
  tourVersion: string;
  contentVersion: string;
  locale: string;
  country: string;
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel: string;
  screenWidth: number;
  screenHeight: number;
  isDarkMode: boolean;
  isRTL: boolean;
  isTablet: boolean;
  networkType: 'wifi' | 'cellular' | 'offline';
  featureFlagVariant?: string;  // للـ A/B Testing
}
```

### 3.8 WhatsnewEngine

```typescript
interface WhatsNewFeature {
  id: string;
  appVersion: string;
  icon: string;              // من نظام الأيقونات
  gradientKey: string;
  title: Record<LangCode, string>;
  description: Record<LangCode, string>;
  cta?: {
    label: Record<LangCode, string>;
    deepLink: string;        // المادة 20 — Deep Link
  };
  priority: number;
  platforms?: ('ios' | 'android')[];
  featureFlag?: string;      // المادة 18
}
```

### 3.9 CooldownManager

```typescript
interface CooldownRules {
  // كل القيم من RemoteConfig (المادة 21)
  // القيم الافتراضية هنا هي fallback فقط
  minMinutesBetweenTours: number;     // 30
  maxToursPerDay: number;             // 3 (default 2)
  firstDayOnlyHome: boolean;          // true
  gracePeriodAfterSkipAll: number;    // Infinity (لا تُعيد)
}
```

---

## 4. Remote Content Management

### 4.1 جدول ما يُدار من CMS

| العنصر | CMS | يتطلب Release | ملاحظة |
|--------|-----|--------------|-------|
| عنوان / وصف الخطوة | ✅ | | عبر Draft→Publish |
| نصوص الأزرار | ✅ | | |
| إظهار/إخفاء خطوة | ✅ | | |
| تفعيل/إيقاف جولة | ✅ | | |
| ترتيب الخطوات | ✅ | | |
| Tour Version | ✅ | | |
| رسائل النجاح + CTA | ✅ | | |
| Deep Link في CTA | ✅ | | المادة 20 |
| What's New Features | ✅ | | |
| A/B Test Variants | ✅ | | |
| Feature Flags | ✅ | | المادة 18 |
| Remote Config | ✅ | | المادة 21 |
| هيكل خطوة جديدة (targetId) | | ✅ | |
| Interactive Action logic | | ✅ | |
| Renderer Implementation | | ✅ | |

### 4.2 CMS API Schema

```typescript
// GET /api/v1/tours/config
interface ToursConfig {
  configVersion: string;
  schemaVersion: string;       // المادة 16
  generatedAt: string;
  tours: TourConfigItem[];
  whatsNew: WhatsNewConfig;
  featureFlags: FeatureFlagSet; // المادة 18
  remoteConfig: PlatformRemoteConfig; // المادة 21
}

// GET /api/v1/tours/{tourId}/content?locale={locale}
interface TourContentResponse {
  tourId: string;
  locale: string;
  schemaVersion: string;
  contentVersion: string;
  tourVersion: string;
  publishedAt: string;
  steps: StepContent[];
  celebration: CelebrationContent;
  cacheMaxAgeSeconds: number;
}

// POST /api/v1/tours/analytics/events
interface AnalyticsBatchRequest {
  events: TourAnalyticsEvent[];
  clientTimestamp: string;
  consentVersion?: string;     // المادة 19
}
```

### 4.3 Caching

```
Hot   (0-1h):   Cache مباشرة
Warm  (1-24h):  Cache + revalidate في الخلفية
Cold  (>24h):   Remote أولاً
Offline:        أي Cache متاح مهما قدم
No cache:       Static Bundle
```

---

## 5. Admin Dashboard

### 5.1 الأقسام

```
1. Analytics
   Completion Rate | Skip Rate | Avg Time | Drop-off per Step
   By Language | By Country | By Platform | By OS | By Device
   By App Version | By Screen Size | By Network | By Dark Mode
   Export: CSV / Excel / JSON

2. Content Management (مع Draft/Publish — المادة 17)
   Tour CRUD | Step CRUD | Reorder | Version Bump | Force Replay

3. What's New Manager
   Feature CRUD | Schedule | Priority | Deep Links

4. Feature Flags (المادة 18)
   Per Flag: On/Off | Country | Platform | App Version | % Users

5. Remote Config (المادة 21)
   Cooldown | Max Tours | Animation Speed | Overlay Opacity

6. A/B Testing
   Create/Stop | Variant Traffic | Statistical Significance | Promote

7. Audit Logs (المادة 6)
   All Admin Actions | Old→New | Export

8. Theme Overrides
   Overlay Opacity | Tooltip Radius | Animation Speed | Accent
```

### 5.2 Analytics Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tour Analytics             [Date Range ▼] [Module ▼] [Platform ▼]  │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │ Started  │ │Completed │ │ Avg Time │ │  Top Drop-off        │  │
│  │  12,430  │ │  70.1%   │ │  2m 34s  │ │  Step 3 — 38% ⚠     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘  │
│                                                                      │
│  Step Funnel          By Language       By Country (Map)            │
│  Step 1: 100%         AR  74%          [Heatmap]                    │
│  Step 2:  88%         EN  71%                                        │
│  Step 3:  62% ⚠      UR  68%          By Device Model              │
│  Step 4:  51%         HI  62%          iPhone 15: 76%               │
│  Finish:  48%         BN  60%          Samsung A14: 61% ⚠          │
│                       FIL 58%                                        │
│                                             [Export CSV] [Excel]    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Audit Logs

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;         // ISO 8601 UTC
  adminId: string;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  resource: { type: string; id: string; displayName: string };
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  notes?: string;
  status: 'success' | 'failed' | 'partial';
}

type AuditAction =
  | 'tour.content.update'   | 'tour.step.add'        | 'tour.step.remove'
  | 'tour.step.reorder'     | 'tour.step.show'        | 'tour.step.hide'
  | 'tour.activate'         | 'tour.deactivate'       | 'tour.version.bump'
  | 'tour.force_replay'     | 'tour.draft.create'     | 'tour.draft.submit'
  | 'tour.draft.approve'    | 'tour.draft.reject'     | 'tour.publish'
  | 'tour.archive'          | 'whats_new.publish'     | 'whats_new.unpublish'
  | 'feature_flag.update'   | 'remote_config.update'  | 'theme.update'
  | 'theme.reset_defaults'  | 'ab_test.create'        | 'ab_test.stop'
  | 'ab_test.promote'       | 'analytics.export';
```

---

## 7. Design System — Concept C (النقاء الطبي)

### 7.1 المبادئ

```
Minimal   — لا عنصر إلا لسبب
Luxury    — كل تفصيلة مدروسة
Medical   — ثقة، هدوء، دقة
Modern    — 2026+، لا مكتبات جاهزة
RTL-First — العربية ليست afterthought
```

### 7.2 الـ Overlay

```
اللون:  colors.overlay من الثيم
        Light: rgba(20, 26, 42, 0.78) | Dark: rgba(0, 0, 0, 0.82)
الشكل:  Hole Punch — خلفية معتمة والعنصر مضاء
لا Blur — أداء ضعيف على Android
```

### 7.3 الـ Spotlight

```
Padding:   10px (من Remote Config)
Animation: scale 1.08 → 1.0, spring damping:20 stiffness:120
Pulse:     opacity 0.12→0, scale 1.0→1.2, 2000ms repeat
           (يُوقَف مع Reduce Motion)
```

### 7.4 الـ Tooltip

```
┌────────────────────────────────────────────┐
│  ①②③④             [تخطَّ الجولة]        │
│                                            │
│  عنوان الخطوة              Cairo-SemiBold 15px
│  وصف موجز ومفيد            Cairo-Regular 13px
│  بأسلوب مريح               colors.textSecondary
│                                            │
│  ─────────────────────────────────────    │
│  [→ التالي]                               │
└────────────────────────────────────────────┘
        ▲ arrow SVG
```

### 7.5 مواصفات الـ Tooltip

| الخاصية | القيمة | المصدر |
|---------|--------|--------|
| Background | `colors.surface` | Theme |
| Border | لا يوجد | — |
| Border Radius | `BorderRadius['2xl']` = 24px | Theme |
| Shadow | `{color:'#000', offset:{0,16}, opacity:0.18, radius:32, elevation:24}` | Custom |
| Padding | `Spacing.xl` = 20px | Theme |
| Max Width | `min(screenWidth - 32, 360)` | Computed |
| Z-Index | `ZIndex.overlay + 10` = 210 | Theme |
| Title | `Typography.h5` — Cairo-SemiBold 16px | Theme |
| Body | `Typography.bodySM` — Cairo-Regular 14px | Theme |

### 7.6 Success Celebration

```
لا Confetti. لا animations طفولية.
نبضة خضراء واحدة (colors.success) + checkmark SVG
رسالة موجزة + CTA → أول تفاعل حقيقي
Auto-dismiss: 3 ثوانٍ
```

---

## 8. Motion Design

| التقنية | الاستخدام | المبرر |
|---------|-----------|--------|
| **Reanimated v3** | كل الحركات | Thread-safe، 60/120fps |
| **react-native-skia** | Spotlight mask | GPU rendering |
| **react-native-svg** | Arrow، Checkmark | خفيف، دقيق |
| **expo-blur** | ❌ ممنوع | أداء ضعيف Android |
| **Lottie** | ❌ ممنوع | overhead غير ضروري |

```typescript
// Animation Tokens من الثيم
const TOUR_ANIMATIONS = {
  overlayFade:     { duration: 280, easing: 'easeOut' },
  spotlightEnter:  { duration: 320, config: Animation.springGentle },
  spotlightMove:   { duration: 380, config: Animation.spring },
  tooltipEnter:    { duration: 260, easing: 'easeOutCubic' },
  tooltipExit:     { duration: 180, easing: 'easeIn' },
  stepTransition:  { duration: 150 },   // Animation.fast
  celebration:     { duration: 500 },   // Animation.slow
  pulseCycle:      { duration: 2000, repeat: true },
  reduceMotion:    { duration: 0 },     // كل شيء instant
};
```

**120Hz:** كل animations على Native Thread. لا JS thread blocking.

---

## 9. Multi-Language & i18n

### 9.1 اللغات المدعومة

| الكود | اللغة | الاتجاه | الحالة |
|------|-------|---------|-------|
| `ar` | العربية | RTL | مدعوم — أولوية قصوى |
| `en` | الإنجليزية | LTR | مدعوم |
| `ur` | الأردية | RTL | مدعوم |
| `hi` | الهندية | LTR | مدعوم |
| `bn` | البنغالية | LTR | مدعوم |
| `fil` | الفلبينية | LTR | مدعوم |
| أي لغة مستقبلية | — | — | يُضاف في CMS بدون code change |

### 9.2 مبدأ عدم الـ Hardcoding

```
كل نص يأتي من:
1. ContentProvider (CMS → Cache → Static)
2. Static Bundle: /assets/tours/{tourId}/{lang}.json

Fallback chain للنصوص:
  locale المطلوب → EN → AR → رسالة عامة
```

### 9.3 RTL/LTR

```typescript
// Arrow Direction، Button Order، Text Alignment
// تُستخدم isRTL من AppContext — لا تُحسَّب locally
// Step Counter: 1, 2, 3 (Western digits دائماً)
```

### 9.4 إضافة لغة جديدة

```
الخطوات:
1. إضافة LangCode في LANGUAGES في AppContext (code change صغير)
2. إضافة ملفات JSON في /assets/tours/{tourId}/{lang}.json
3. إضافة في CMS
4. لا تغيير في TourEngine أو أي module آخر
```

---

## 10. Accessibility

### 10.1 VoiceOver / TalkBack

```typescript
// الـ Overlay يحجب focus عن الخلف
accessibilityViewIsModal={true}

// العنصر المستهدف يُحصل على focus
AccessibilityInfo.setAccessibilityFocus(targetRef._nativeTag)

// كل زر له accessibilityLabel + accessibilityHint
// مثال: "التالي، الخطوة 2 من 4، انتقل للخطوة التالية"
```

### 10.2 Touch Targets

```
كل زر: minimum 48×48px
hitSlop: { top:8, bottom:8, left:8, right:8 }
زر Skip (نص فقط): padding 12px على كل جانب
```

### 10.3 Dynamic Type

```typescript
allowFontScaling={true}
maxFontSizeMultiplier={1.5}
// Large Text → Tooltip يتمدد، لا truncation
```

### 10.4 High Contrast

```typescript
// iOS/Android: AccessibilityInfo.isHighTextContrastEnabled()
// عند التفعيل:
// overlayOpacity: 0.92 | tooltipBorder: 2px | fontWeight: 800
```

### 10.5 Reduce Motion

```typescript
// AccessibilityInfo.isReduceMotionEnabled()
// عند التفعيل: duration = 0 لكل شيء
// لا pulse, لا scale, لا translateY
```

---

## 11. Performance Budget

| المقياس | الحد الأقصى | الهدف |
|---------|------------|-------|
| أول خطوة تُعرض | < 300ms | < 150ms |
| انتقال بين خطوات | < 100ms | < 60ms |
| Frame rate أثناء animation | ≥ 60fps | 120fps |
| Memory overhead | < 15MB | < 8MB |
| Bundle size (JS gzipped) | < 30KB | < 20KB |
| تأثير على Startup | صفر | صفر |
| تأثير على Scroll | صفر | صفر |

**ضمانات:**
- كل animations على Native Thread
- لا setState داخل animation callbacks
- Reanimated Shared Values للـ animated values
- كل timers تُلغى في cleanup
- كل EventListeners تُزال عند Unmount
- Skia drawing على Graphics Thread

---

## 12. Compatibility Matrix

| المتطلب | الدعم | ملاحظة |
|---------|------|-------|
| iOS ≥ 15.0 | ✅ | |
| Android ≥ API 24 | ✅ | |
| iPhone 320px → 430px | ✅ | |
| Dynamic Island | ✅ | useSafeAreaInsets |
| Notch | ✅ | useSafeAreaInsets |
| iPad | ✅ | maxWidth 360px |
| Android Tablet | ✅ | |
| Foldables | ✅ | يُعيد الحساب عند window size change |
| Landscape | ✅ | Tooltip يُعيد التموضع |
| Split Screen | ✅ Best Effort | |
| Light / Dark | ✅ | |
| RTL / LTR | ✅ | |

---

## 13. Testing Plan

### فئات الاختبار

| الفئة | الأدوات | المستوى |
|-------|---------|---------|
| Unit Tests | Jest + RNTL | Component level |
| Integration | Jest + AsyncStorage mock | Flow level |
| UI / E2E | Maestro / Detox | User flow level |
| Performance | Flipper + Skia Debugger | Frame/Memory |
| Accessibility | Screen readers + manual | A11y compliance |
| RTL | Manual + automated | Layout correctness |
| Localization | All 6 languages | Content fit |
| Offline | Mocked network | Graceful degradation |
| Crash Recovery | Forced crash scenarios | Recovery loop protection |
| Regression | Full suite on each Phase | No breakage |
| Rotation | Portrait ↔ Landscape | Layout reflow |
| Low Memory | Memory pressure test | No crash |
| Deep Links | All CTA routes | Navigation correctness |
| Push During Tour | Mocked push payload | Interruption handling |
| Background/Resume | App state changes | Tour state preservation |

---

# الجزء الثاني — الإضافات المعمارية الجديدة

---

## 14. Pluggable Renderer Interface

### 14.1 المشكلة

الربط المباشر بـ Skia يجعل الـ Tour Engine غير قابل للاختبار بسهولة، وأي تغيير في محرك الرسم يتطلب تعديل الـ Engine.

### 14.2 الحل — Renderer Interface

```typescript
// واجهة مجردة — لا تعتمد على أي مكتبة محددة
interface SpotlightRendererInterface {
  readonly name: string;
  readonly isSupported: () => boolean;

  render(config: SpotlightRenderConfig): React.ReactElement;
  dispose(): void;
}

interface SpotlightRenderConfig {
  targetRect: LayoutRect;      // { x, y, width, height }
  shape: HighlightShape;
  padding: number;
  dimColor: string;
  dimOpacity: number;
  pulseEnabled: boolean;
  reduceMotion: boolean;
  children: React.ReactNode;
}

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 14.3 Renderers

```typescript
// SkiaRenderer — الأفضل أداءً
class SkiaRenderer implements SpotlightRendererInterface {
  name = 'skia';
  isSupported = () => {
    // Skia مدعوم على iOS 14+ و Android API 21+
    // يتحقق runtime
    try {
      require('@shopify/react-native-skia');
      return true;
    } catch {
      return false;
    }
  };
  render(config: SpotlightRenderConfig): React.ReactElement { ... }
  dispose(): void { ... }
}

// SvgRenderer — Fallback
class SvgRenderer implements SpotlightRendererInterface {
  name = 'svg';
  isSupported = () => true; // دائماً مدعوم
  render(config: SpotlightRenderConfig): React.ReactElement { ... }
  dispose(): void { ... }
}

// FutureRenderer — مثال مستقبلي
// class WebGLRenderer implements SpotlightRendererInterface { ... }
// class CanvasRenderer implements SpotlightRendererInterface { ... }
```

### 14.4 RendererFactory — الاختيار التلقائي

```typescript
class RendererFactory {
  private static renderers: SpotlightRendererInterface[] = [
    new SkiaRenderer(),
    new SvgRenderer(),    // Fallback أخير
  ];

  static getOptimalRenderer(): SpotlightRendererInterface {
    for (const renderer of this.renderers) {
      if (renderer.isSupported()) {
        return renderer;
      }
    }
    // SvgRenderer دائماً يُرجع true — لن نصل هنا أبداً
    throw new Error('No supported renderer found');
  }

  static registerRenderer(
    renderer: SpotlightRendererInterface,
    priority: number
  ): void {
    this.renderers.splice(priority, 0, renderer);
  }
}
```

### 14.5 TourContext يستخدم الـ Interface فقط

```typescript
// TourContext لا يعرف SkiaRenderer أو SvgRenderer
// يعرف فقط SpotlightRendererInterface
const renderer = RendererFactory.getOptimalRenderer();
```

---

## 15. Target Resolver Layer

### 15.1 المشكلة

الاعتماد على `testID` فقط يفشل مع:
- العناصر الديناميكية (مثل قائمة تتغير)
- العناصر داخل FlatList
- العناصر داخل ScrollView
- العناصر التي تتأخر في الظهور (lazy loading)

### 15.2 TargetConfig — ثلاث طرق استهداف

```typescript
interface TargetConfig {
  // الطريقة 1: testID (الأبسط — لعناصر ثابتة)
  testId?: string;

  // الطريقة 2: Ref مباشر (للعناصر المعروفة في compile time)
  ref?: React.RefObject<any>;

  // الطريقة 3: Resolver ديناميكي (للحالات المعقدة)
  resolver?: TargetResolverFunction;

  // Fallback إذا فشلت كل الطرق
  fallback?: FallbackBehavior;
}

type TargetResolverFunction = () => Promise<LayoutRect | null>;

type FallbackBehavior =
  | 'skip_step'      // تخطي الخطوة بصمت
  | 'skip_tour'      // إنهاء الجولة
  | 'center_screen'  // عرض الـ Tooltip في المنتصف بدون Spotlight
  | 'retry';         // أعد المحاولة بعد 500ms
```

### 15.3 TargetResolver — المحلِّل

```typescript
class TargetResolver {
  async resolve(config: TargetConfig): Promise<LayoutRect | null> {
    // الأولوية: ref → testId → resolver → fallback

    if (config.ref?.current) {
      return this.measureRef(config.ref.current);
    }

    if (config.testId) {
      const element = this.findByTestId(config.testId);
      if (element) return this.measureRef(element);
    }

    if (config.resolver) {
      return await config.resolver();
    }

    return null; // يُعامَل حسب fallback في TourStepDefinition
  }

  private measureRef(ref: any): Promise<LayoutRect> {
    return new Promise((resolve) => {
      ref.measure(
        (_x: number, _y: number, width: number, height: number,
         pageX: number, pageY: number) => {
          resolve({ x: pageX, y: pageY, width, height });
        }
      );
    });
  }

  private findByTestId(testId: string): any | null {
    // يستخدم RN accessibility API للبحث
    // يعمل على iOS و Android
    return null; // implementation في Phase 1
  }
}
```

### 15.4 Retry Mechanism

```typescript
// إذا فشل الـ resolve في المحاولة الأولى:
// 1. انتظر 300ms (onLayout قد لم يكتمل بعد)
// 2. حاول مرة أخرى
// 3. إذا فشل مرة ثانية → تطبّق fallback

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 300;
```

---

## 16. Multi-Layer Versioning

### 16.1 المشكلة

Version واحدة تجمع بين المنطق والمحتوى والـ Schema تُجبرنا على إعادة عرض الجولة حتى عند تغيير بسيط في نص.

### 16.2 الأربع طبقات

```typescript
interface TourVersioning {
  // 1. Schema Version — يتغير عند تغيير هيكل البيانات (breaking change)
  schemaVersion: string;         // "1.0.0"
  // مثال: إضافة حقل جديد مطلوب في TourStepDefinition

  // 2. Content Version — يتغير عند تعديل أي نص أو CTA
  contentVersion: string;        // "1.4.2"
  // مثال: تصحيح نص خطوة، إضافة ترجمة جديدة

  // 3. Tour Version — يتغير عند تغيير منطق الجولة أو خطواتها
  tourVersion: string;           // "2.0.0"
  // مثال: إضافة خطوة جديدة، تغيير ترتيب الخطوات
  // يُجبر إعادة عرض الجولة للمستخدمين الذين أكملوها سابقاً

  // 4. App Compatibility Version — نطاق إصدارات التطبيق المدعومة
  appCompatVersion: string;      // ">=2.0.0 <3.0.0"
  // مثال: الجولة الجديدة تعتمد على شاشة غير موجودة في v1.x
}
```

### 16.3 قواعد الـ Versioning

```
contentVersion تتغير → لا تُعاد الجولة للمستخدمين الذين أكملوها
                       فقط تُحدَّث النصوص عند الجلسة التالية

tourVersion تتغير    → يُقارَن مع last_seen_tour_version
                       إذا اختلف → تُعرض الجولة مجدداً

schemaVersion تتغير  → يُعاد بناء الـ Cache بالكامل
                       PersistenceManager يتحقق من التوافق

appCompatVersion     → لا تُعرض الجولة خارج النطاق المحدد
```

### 16.4 في PersistenceManager

```typescript
// عند المقارنة:
if (record.tourVersion !== currentTour.tourVersion) {
  // tourVersion اختلف → نتجاهل record القديم
  return null; // كأن المستخدم لم يرَها من قبل
}

if (record.schemaVersion !== currentTour.schemaVersion) {
  // schema تغيّر → نحذف الـ record ونبدأ من جديد
  await this.delete(record.tourId, record.userId);
  return null;
}

// contentVersion مختلف → لا يؤثر على حالة الجولة
// فقط يُعيد تحميل المحتوى من CMS
```

---

## 17. CMS Draft / Publish Workflow

### 17.1 مراحل Workflow

```
                  ┌──────────┐
                  │  Draft   │ ← Admin يُنشئ أو يُعدّل
                  └────┬─────┘
                       │ Submit for Review
                  ┌────▼─────┐
                  │  Review  │ ← Admin آخر يراجع
                  └────┬─────┘
                     ┌─┴─┐
           Approve   │   │  Reject
                     │   │
              ┌──────▼┐  └──▼───────┐
              │Published│           │  Draft   │ ← يعود للتعديل
              └────┬───┘           └──────────┘
                   │ Manually or Auto-expire
              ┌────▼────┐
              │ Archived │
              └──────────┘
```

### 17.2 القواعد

```
- لا يُنشر أي تعديل بمجرد الضغط على Save
- Draft → Review: يتطلب admin ثانٍ (Reviewer role)
- Review → Published: يُرسَل للـ Mobile clients فوراً
- Published → Archived: يدوي أو تلقائي بعد انتهاء الصلاحية
- الـ Mobile client دائماً يجلب Published فقط
- Draft و Review لا يُرسلان للـ clients أبداً
```

### 17.3 في Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Content Manager                           [+ New Tour]     │
│                                                             │
│  home_v2              Published  v2.0.0     [Edit] [Archive]│
│  home_v2 (draft)      Draft      v2.1.0     [Submit] [Delete]│
│  pharmacy_v3          Review     v1.2.0     [Approve] [Reject]│
│                                                             │
│  Draft Editor:                                              │
│  ← يظهر Preview real-time بجانب التعديلات                  │
│  ← Save Draft (لا يُنشر)                                    │
│  ← Submit for Review (يُنبّه الـ Reviewer)                  │
└─────────────────────────────────────────────────────────────┘
```

### 17.4 Audit Log لكل خطوة في الـ Workflow

```
tour.draft.create    → أنشأ draft جديد
tour.draft.update    → عدّل draft
tour.draft.submit    → أرسل للمراجعة
tour.draft.approve   → وافق الـ Reviewer
tour.draft.reject    → رفض الـ Reviewer + سبب الرفض
tour.publish         → نُشر للـ production
tour.archive         → أُرشف
```

---

## 18. Feature Flags System

### 18.1 الغرض

تشغيل أو إيقاف أي نمط من الـ Product Discovery Platform بدون Release، لمجموعات محددة من المستخدمين.

### 18.2 الـ Feature Flags المُعرَّفة

```typescript
type PlatformFeatureFlag =
  | 'guided_tours'           // كل الجولات
  | 'whats_new'              // What's New engine
  | 'contextual_tips'        // التلميحات السياقية
  | 'feature_badges'         // النقاط على الميزات الجديدة
  | 'ai_hints'               // التلميحات الذكية (Phase 4)
  | 'interactive_steps'      // الخطوات التفاعلية
  | 'success_celebration'    // احتفال الإكمال
  | 'resume_prompt';         // اقتراح الاستئناف
```

### 18.3 Targeting Rules

```typescript
interface FeatureFlag {
  id: PlatformFeatureFlag;
  enabled: boolean;          // الحالة الافتراضية

  targeting?: {
    countries?: string[];      // ["SA", "AE", "KW"]
    platforms?: ('ios' | 'android')[];
    minAppVersion?: string;    // "2.0.0"
    maxAppVersion?: string;
    userPercentage?: number;   // 0-100 — A/B rollout
    userIds?: string[];        // override لمستخدمين محددين (hashed)
  };

  // Logging
  logExposure: boolean;       // هل نسجّل analytics عند التقييم؟
}

interface FeatureFlagSet {
  version: string;
  flags: Record<PlatformFeatureFlag, FeatureFlag>;
  generatedAt: string;
}
```

### 18.4 FeatureFlagsEngine

```typescript
class FeatureFlagsEngine {
  constructor(private storage: StorageInterface,
              private remoteConfig: RemoteConfigInterface) {}

  async isEnabled(
    flag: PlatformFeatureFlag,
    context: EvaluationContext
  ): Promise<boolean> {
    const flagDef = await this.getFlag(flag);
    if (!flagDef) return false;
    if (!flagDef.enabled) return false;

    return this.evaluateTargeting(flagDef, context);
  }

  private evaluateTargeting(
    flag: FeatureFlag,
    context: EvaluationContext
  ): boolean {
    const { countries, platforms, minAppVersion, userPercentage } =
      flag.targeting ?? {};

    if (countries && !countries.includes(context.country)) return false;
    if (platforms && !platforms.includes(context.platform)) return false;
    if (minAppVersion && !this.versionGte(context.appVersion, minAppVersion))
      return false;
    if (userPercentage !== undefined) {
      // Deterministic hash — نفس المستخدم يحصل على نفس النتيجة دائماً
      const bucket = this.getBucket(context.userId, flag.id);
      if (bucket >= userPercentage) return false;
    }
    return true;
  }
}

interface EvaluationContext {
  userId: string;    // hashed
  country: string;
  platform: 'ios' | 'android';
  appVersion: string;
  locale: string;
}
```

### 18.5 في TourEngine

```typescript
// قبل عرض أي جولة:
const canShow = await featureFlags.isEnabled('guided_tours', context);
if (!canShow) return; // لا جولة

// قبل interactive step:
const canInteract = await featureFlags.isEnabled('interactive_steps', context);
if (!canInteract) {
  // عرض الخطوة كـ passive بدل interactive
}
```

---

## 19. Privacy & Consent

### 19.1 المبادئ

```
Privacy by Design — الخصوصية مُدمجة في الـ Architecture وليست add-on

1. No PII — لا نجمع أي Personally Identifiable Information
   userId = SHA-256(deviceId + userId_from_auth) — غير قابل للعكس
   deviceModel = فئة عامة (مثل "iPhone 15 series")، لا MAC address

2. Consent Gate — إذا طُلب Consent، لا analytics حتى يوافق المستخدم
3. Deletable — المستخدم يستطيع حذف كل بياناته
4. Auditable — كل processing موثق
```

### 19.2 Consent System

```typescript
type ConsentStatus =
  | 'unknown'      // لم يُسأل بعد
  | 'granted'      // وافق
  | 'denied'       // رفض
  | 'withdrawn';   // سحب موافقته

interface ConsentRecord {
  status: ConsentStatus;
  grantedAt?: string;
  withdrawnAt?: string;
  consentVersion: string;    // إصدار نص الـ Consent
  locale: string;            // اللغة التي وافق بها
}

// AnalyticsCollector يتحقق قبل كل إرسال:
if (consent.status !== 'granted') {
  // لا إرسال. لا تخزين. لا شيء.
  return;
}
```

### 19.3 Data Minimization

```typescript
// ما نجمعه وما لا نجمعه:

// ✅ نجمعه:
userId_hash      // SHA-256, غير reversible
locale           // اللغة المختارة
country          // من IP geolocation (دولة فقط، لا مدينة)
platform         // ios / android
appVersion
osVersion        // major.minor فقط (لا build number)
deviceModel      // فئة عامة
screenResolution // rounded to nearest 100px
isDarkMode
isTablet

// ❌ لا نجمعه أبداً:
// IP Address الحقيقي
// اسم المستخدم
// رقم الهاتف
// البريد الإلكتروني
// الموقع الجغرافي الدقيق
// IDFA / GAID
// Keystrokes أو محتوى النصوص
// Screenshots
```

### 19.4 GDPR & PDPL Readiness

```
Saudi PDPL (Personal Data Protection Law):
  ✅ Data collected is minimized to necessity
  ✅ User can request deletion
  ✅ Processing is logged (Audit Logs)
  ✅ No data sold or shared with third parties
  ✅ Consent documented with version and locale

GDPR (للمستخدمين الأوروبيين إن وُجدوا):
  ✅ Right to erasure: DELETE /api/v1/analytics/user/{userId_hash}
  ✅ Data portability: GET /api/v1/analytics/export/{userId_hash}
  ✅ Consent withdrawal supported
```

### 19.5 Data Deletion

```typescript
// المستخدم يطلب حذف بياناته:

// 1. Mobile: يحذف كل AsyncStorage keys بـ @nabdah_tour_
// 2. Backend: DELETE /api/v1/analytics/user/{userId_hash}
//    يحذف كل events مرتبطة بهذا الـ hash
// 3. Audit Log: يُسجَّل طلب الحذف (لكن بدون بيانات المستخدم)

// Note: الـ Aggregate data (completion rates, etc.) لا تُحذف
// لأنها لا تحتوي على identifier فردي
```

---

## 20. Deep Links System

### 20.1 الغرض

أي CTA داخل الجولة أو What's New يستطيع التنقل إلى أي وجهة بدون تعديل الكود.

### 20.2 Deep Link Format

```typescript
// نستخدم DEEP_LINK_SCHEME من theme/index.ts
// DEEP_LINK_SCHEME = 'nabdahplus'

type DeepLinkTarget =
  | InternalRoute      // شاشة داخلية في التطبيق
  | ExternalUrl        // رابط خارجي (يفتح Browser)
  | FeatureAction;     // إجراء محدد

interface InternalRoute {
  type: 'internal';
  path: string;        // "/(tabs)/pharmacy"
  params?: Record<string, string>;
}

interface ExternalUrl {
  type: 'external';
  url: string;         // "https://nabdahplus.com/blog/..."
  openIn: 'browser' | 'in_app_browser';
}

interface FeatureAction {
  type: 'action';
  action: 'open_scanner' | 'start_prescription' | 'call_pharmacist' | ...;
  params?: Record<string, string>;
}
```

### 20.3 DeepLinkResolver

```typescript
class DeepLinkResolver {
  async resolve(deepLink: string): Promise<void> {
    // Format: nabdahplus://pharmacy?scan=true
    // أو: https://nabdahplus.com/tour-cta/pharmacy-scan
    // أو: action://open_scanner

    const parsed = this.parse(deepLink);

    switch (parsed.type) {
      case 'internal':
        router.push({ pathname: parsed.path, params: parsed.params });
        break;

      case 'external':
        if (parsed.openIn === 'in_app_browser') {
          await WebBrowser.openBrowserAsync(parsed.url);
        } else {
          Linking.openURL(parsed.url);
        }
        break;

      case 'action':
        await this.executeAction(parsed.action, parsed.params);
        break;
    }
  }
}
```

### 20.4 في الـ CMS

```
CTA Route في Dashboard:
  [Type ▼: Internal / External / Action]

  Internal:
    Path: [/(tabs)/pharmacy         ]
    Params: [{ "tab": "scanner" }  ]

  External:
    URL: [https://nabdahplus.com/help]
    Open: [In-App Browser ▼]

  Action:
    Action: [open_scanner          ▼]
    Params: [                       ]
```

### 20.5 Security

```
Deep Links تُتحقق من صحتها قبل التنفيذ:
1. Internal paths تُتحقق من whitelist
2. External URLs تُتحقق من domain whitelist
3. لا dynamic code execution
4. لا file system access
```

---

## 21. Remote Configuration

### 21.1 ما يُدار من Remote Config

```typescript
interface PlatformRemoteConfig {
  // Cooldown
  cooldown: {
    minMinutesBetweenTours: number;      // default: 30
    maxToursPerDay: number;              // default: 2
    firstDayOnlyHome: boolean;           // default: true
    resumeWindowHours: number;           // default: 48
  };

  // Animation
  animation: {
    speedMultiplier: number;             // 0.5 → 2.0 (default: 1.0)
    // multiplier يُضرب في كل duration
  };

  // Spotlight
  spotlight: {
    overlayOpacity: number;             // 0.5 → 1.0 (default: 0.78)
    padding: number;                    // 4 → 20 (default: 10)
    pulseEnabled: boolean;              // default: true
  };

  // Tooltip
  tooltip: {
    borderRadius: number;               // 12 → 32 (default: 24)
    maxWidthFactor: number;             // 0.7 → 0.95 (default: 0.85)
  };

  // Modules
  disabledModules: ModuleKey[];         // إيقاف وحدات كاملة بدون Release

  // Force Controls
  forceReplayAll: boolean;             // default: false
  globallyDisabled: boolean;           // إيقاف كامل للمنصة (طوارئ)

  // Analytics
  analyticsBatchSize: number;          // default: 20
  analyticsFlushIntervalSeconds: number; // default: 30
  analyticsEnabled: boolean;           // default: true
}
```

### 21.2 RemoteConfigManager

```typescript
class RemoteConfigManager implements RemoteConfigInterface {
  // Fallback Chain:
  // Remote API → AsyncStorage Cache → Hard-coded Defaults

  async getConfig(): Promise<PlatformRemoteConfig> {
    try {
      const remote = await this.fetchRemote();
      await this.cache(remote);
      return remote;
    } catch {
      const cached = await this.getCached();
      return cached ?? DEFAULT_CONFIG;
    }
  }

  // يُستمع لـ updates فورية عبر WebSocket (اختياري في Phase 3)
  subscribeToUpdates(callback: (config: PlatformRemoteConfig) => void): void {
    // WebSocket أو Polling كل 5 دقائق
  }
}

const DEFAULT_CONFIG: PlatformRemoteConfig = {
  cooldown: {
    minMinutesBetweenTours: 30,
    maxToursPerDay: 2,
    firstDayOnlyHome: true,
    resumeWindowHours: 48,
  },
  animation: { speedMultiplier: 1.0 },
  spotlight: { overlayOpacity: 0.78, padding: 10, pulseEnabled: true },
  tooltip: { borderRadius: 24, maxWidthFactor: 0.85 },
  disabledModules: [],
  forceReplayAll: false,
  globallyDisabled: false,
  analyticsBatchSize: 20,
  analyticsFlushIntervalSeconds: 30,
  analyticsEnabled: true,
};
```

### 21.3 في Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Remote Configuration                    [Save] [Reset All] │
│                                                             │
│  Cooldown                                                   │
│  Min Minutes Between Tours: [30    ]                        │
│  Max Tours Per Day:         [2     ]                        │
│  Resume Window (hours):     [48    ]                        │
│                                                             │
│  Animation                                                  │
│  Speed Multiplier: [Slow ─────●──── Fast]  1.0×            │
│                                                             │
│  Spotlight                                                  │
│  Overlay Opacity: [Light ──────●─── Dark]  0.78            │
│  Padding (px):    [4px ─────●──────────]  10px             │
│  Pulse Effect:    [ON]                                      │
│                                                             │
│  Emergency Controls                          ⚠ Danger Zone  │
│  Disable All Tours: [OFF] ← يُوقف كل الجولات فوراً        │
│  Force Replay All:  [OFF] ← يُعيد كل الجولات لكل المستخدمين│
│                                                             │
│  Changes take effect within 5 minutes globally.            │
│  All changes are logged in Audit Log.                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 22. Crash Safety & Recovery

### 22.1 Strategy الكاملة

```
المشكلة: التطبيق crash أثناء الجولة
         أو cycle من: tour starts → crash → tour starts → crash

الحل: ثلاث طبقات حماية:

Layer 1 — Error Boundary (React)
  يلتقط أخطاء الـ render ويُخفي الجولة بأمان

Layer 2 — CrashRecoveryManager
  يتتبع عدد الـ crashes لكل جولة
  يمنع الـ Loop عند تجاوز الحد

Layer 3 — Graceful Degradation
  إذا فشل كل شيء → التطبيق يعمل بدون الجولة تماماً
```

### 22.2 CrashRecoveryManager

```typescript
interface CrashRecoveryConfig {
  maxCrashesBeforeDisable: number;    // default: 3
  crashWindowMinutes: number;         // default: 60
  disableDurationHours: number;       // default: 24
}

class CrashRecoveryManager {
  async recordCrash(tourId: string, userId: string): Promise<void> {
    const record = await this.persistence.get(tourId, userId);

    // أحدث الـ crash count
    const updatedRecord = {
      ...record,
      crashCount: (record?.crashCount ?? 0) + 1,
      lastCrashAt: new Date().toISOString(),
    };

    await this.persistence.save(updatedRecord);

    // سجّل في Analytics
    await this.analytics.track('tour_crash', { tourId, crashCount: updatedRecord.crashCount });
  }

  async isSafeToStart(tourId: string, userId: string): Promise<boolean> {
    const record = await this.persistence.get(tourId, userId);
    if (!record) return true;

    const { crashCount, lastCrashAt } = record;
    if (crashCount < this.config.maxCrashesBeforeDisable) return true;

    // تحقق من مرور وقت كافٍ
    const hoursSinceLastCrash = this.hoursSince(lastCrashAt);
    if (hoursSinceLastCrash > this.config.disableDurationHours) {
      // أعد التهيئة بعد انتهاء فترة التعطيل
      await this.resetCrashCount(tourId, userId);
      return true;
    }

    return false; // محظور — عدد Crash تجاوز الحد
  }
}
```

### 22.3 Error Boundary

```typescript
class TourErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // لا نُعيد throw — نبتلع الخطأ ونُخفي الجولة
    this.props.onError?.(error);

    // سجّل في CrashRecoveryManager
    // سجّل في Analytics
    // لا نعرض أي شيء للمستخدم — الجولة تختفي بصمت
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null; // الجولة لا تُعرض — التطبيق يعمل بشكل طبيعي
    }
    return this.props.children;
  }
}
```

### 22.4 State Preservation

```typescript
// الـ PersistenceManager يحفظ بعد كل خطوة، لا بعد إكمال الجولة
// هذا يضمن عدم فقدان التقدم عند Crash في أي خطوة

// عند Crash:
// 1. ErrorBoundary يُخفي الجولة
// 2. CrashRecoveryManager يُسجِّل الـ crash
// 3. عند إعادة الفتح:
//    - crashCount < maxCrashes → عرض Resume prompt
//    - crashCount >= maxCrashes → لا تُعرض الجولة (تُعطَّل 24h)
```

---

## 23. Dependency Injection

### 23.1 المبدأ

```
لا service تستدعي service أخرى مباشرة.
كل dependency تُمرَّر عبر Interface.

الفائدة:
1. Testability — يمكن استبدال أي service بـ mock في الاختبارات
2. Replaceability — يمكن استبدال Analytics أو Storage بدون تعديل الـ Engine
3. Decoupling — TourEngine لا يعرف ما إذا كان Analytics يرسل لـ Firebase أو Segment
```

### 23.2 الـ Interfaces

```typescript
// Storage
interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

// Analytics
interface AnalyticsInterface {
  track(event: TourEventType, properties: Partial<TourAnalyticsEvent>): void;
  flush(): Promise<void>;
  setConsent(granted: boolean): void;
}

// CMS / Content
interface ContentInterface {
  getContent(tourId: string, locale: string): Promise<TourContentResponse>;
  getConfig(): Promise<ToursConfig>;
  invalidateCache(tourId?: string): Promise<void>;
}

// Renderer
interface SpotlightRendererInterface {
  name: string;
  isSupported(): boolean;
  render(config: SpotlightRenderConfig): React.ReactElement;
  dispose(): void;
}

// Remote Config
interface RemoteConfigInterface {
  getConfig(): Promise<PlatformRemoteConfig>;
  subscribeToUpdates(cb: (config: PlatformRemoteConfig) => void): () => void;
}

// Logger
interface LoggerInterface {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}
```

### 23.3 DI Container

```typescript
// Container بسيط — لا نحتاج InversifyJS أو Tsyringe
// نبني container خفيف مخصص للمنصة

interface PlatformServices {
  storage: StorageInterface;
  analytics: AnalyticsInterface;
  content: ContentInterface;
  renderer: SpotlightRendererInterface;
  remoteConfig: RemoteConfigInterface;
  logger: LoggerInterface;
}

class PlatformContainer {
  private static instance: PlatformServices;

  static initialize(services: Partial<PlatformServices>): void {
    this.instance = {
      storage: services.storage ?? new AsyncStorageAdapter(),
      analytics: services.analytics ?? new AnalyticsCollector(),
      content: services.content ?? new ContentProvider(),
      renderer: services.renderer ?? RendererFactory.getOptimalRenderer(),
      remoteConfig: services.remoteConfig ?? new RemoteConfigManager(),
      logger: services.logger ?? new ConsoleLogger(),
    };
  }

  static get(): PlatformServices {
    if (!this.instance) {
      throw new Error('PlatformContainer not initialized');
    }
    return this.instance;
  }
}
```

### 23.4 في الاختبارات

```typescript
// Unit Test — نستبدل كل dependency بـ mock
beforeEach(() => {
  PlatformContainer.initialize({
    storage: new InMemoryStorage(),
    analytics: new MockAnalytics(),
    content: new StaticContentProvider(),
    renderer: new MockRenderer(),
    remoteConfig: new StaticRemoteConfig(DEFAULT_CONFIG),
    logger: new SilentLogger(),
  });
});
```

---

## 24. Architecture Decision Records

### 24.1 هيكل المجلد

```
docs/
└── adr/
    ├── README.md                        ← فهرس كل الـ ADRs
    ├── ADR-001-renderer-interface.md
    ├── ADR-002-context-not-redux.md
    ├── ADR-003-static-then-cms.md
    ├── ADR-004-multi-layer-versioning.md
    ├── ADR-005-skia-primary-renderer.md
    ├── ADR-006-no-lottie.md
    ├── ADR-007-asyncstorage-not-securestore.md
    ├── ADR-008-user-bound-persistence.md
    ├── ADR-009-custom-di-container.md
    └── ADR-010-draft-publish-workflow.md
```

### 24.2 Template للـ ADR

```markdown
# ADR-XXX: [عنوان القرار]

**الحالة:** [Proposed / Accepted / Deprecated / Superseded by ADR-YYY]
**تاريخ القرار:** YYYY-MM-DD
**صاحب القرار:** [الاسم أو الدور]

## السياق

[وصف المشكلة أو الحاجة التي أدت لهذا القرار]

## البدائل المدروسة

| البديل | المميزات | العيوب |
|--------|---------|--------|
| ...    | ...     | ...    |

## القرار

[ماذا اخترنا ولماذا]

## النتائج

[ما الذي يترتب على هذا القرار؟ ماذا يصبح أسهل؟ ماذا يصبح أصعب؟]

## المراجعة

[تاريخ مراجعة القرار إذا احتاج للتغيير]
```

### 24.3 الـ ADRs المكتوبة مسبقاً (ملخصات)

**ADR-001 — Renderer Interface**
```
السياق: نحتاج Spotlight rendering لكن لا نريد الارتباط بـ Skia
القرار: واجهة مجردة SpotlightRendererInterface + Factory للاختيار التلقائي
النتيجة: +Testability +Replaceability -Complexity بسيطة
```

**ADR-002 — Context بدل Redux**
```
السياق: نحتاج state management للجولة
القرار: React Context + useReducer — لا Redux, لا Zustand
السبب: حالة UI مؤقتة، لا تحتاج لـ global app state store
النتيجة: +بساطة +أقل dependencies -لا time-travel debugging
```

**ADR-003 — Static أولاً ثم CMS**
```
السياق: هل نعتمد على CMS من اليوم الأول؟
القرار: Phase 1 يعمل بالكامل على Static Bundle. CMS يُضاف في Phase 3.
السبب: موثوقية أعلى، سرعة أكبر، لا dependency في Phase 1
النتيجة: +Reliability +Offline Support -محتوى غير محدَّث حتى Phase 3
```

**ADR-004 — Multi-Layer Versioning**
```
السياق: version واحدة تُجبر إعادة الجولة عند أي تعديل
القرار: 4 versions (Schema, Content, Tour, AppCompat)
السبب: كل طبقة لها دورة حياة مختلفة
النتيجة: +دقة أكبر في التحكم -complexity في المقارنة
```

**ADR-005 — Skia كـ Primary Renderer**
```
السياق: كيف نرسم الـ Spotlight بأفضل أداء؟
القرار: @shopify/react-native-skia مع SvgRenderer كـ Fallback
السبب: GPU rendering, أفضل أداء للـ clipping, مدعوم من Shopify
النتيجة: +60/120fps +smooth clipping -حجم أكبر في البندل (Skia ثقيل)
```

**ADR-006 — لا Lottie**
```
السياق: هل نستخدم Lottie للـ Success Celebration؟
القرار: لا. نستخدم Reanimated فقط.
السبب: Lottie ملفات JSON خارجية + overhead + مشاكل مع RTL
النتيجة: +أداء +تحكم كامل -لا Rich animations جاهزة
```

**ADR-007 — AsyncStorage لا SecureStore**
```
السياق: أين نحفظ بيانات حالة الجولة؟
القرار: AsyncStorage
السبب: بيانات الجولة ليست حساسة (لا passwords, لا tokens)
SecureStore للبيانات الحساسة فقط
النتيجة: +سرعة أكبر +بساطة -لا encryption (غير مطلوب هنا)
```

**ADR-008 — Persistence مرتبط بالمستخدم لا الجهاز**
```
السياق: ماذا يحدث عند تسجيل مستخدم آخر على نفس الجهاز؟
القرار: Key = @nabdah_tour_{tourId}_{userId_hash}
السبب: كل مستخدم له تجربة مستقلة
النتيجة: +عدل بين المستخدمين -أكثر records في Storage
```

**ADR-009 — Custom DI Container**
```
السياق: هل نستخدم InversifyJS أو Tsyringe؟
القرار: Container بسيط مخصص (PlatformContainer)
السبب: المنصة صغيرة بما يكفي، المكتبات الخارجية زيادة غير مبررة
النتيجة: +بساطة +لا dependencies -لا advanced DI features
```

**ADR-010 — Draft/Publish Workflow**
```
السياق: هل نسمح بالنشر الفوري من Admin؟
القرار: Draft → Review → Publish workflow إلزامي
السبب: تعديل خاطئ يصل لـ millions من المستخدمين فوراً
النتيجة: +جودة +مراجعة -بطء في النشر
```

---

## 25. Definition of Done — Enhanced

### 25.1 تعريف "مكتمل" لكل Phase

لا يُعتبر أي Phase منتهياً حتى اكتمال **جميع** البنود التالية:

```
□ الكود مكتوب ومراجع (Code Review approved)
□ Unit Tests: coverage ≥ 80% للوحدات الجديدة
□ Integration Tests: كل الـ scenarios الرئيسية تمر
□ UI Tests (Maestro): happy path + edge cases
□ Performance Review:
    □ Frame rate ≥ 60fps (Flipper verified)
    □ Memory overhead < 15MB
    □ Bundle size لا يتجاوز الحد
□ Accessibility Review:
    □ VoiceOver/TalkBack يقرآن كل عنصر بالترتيب الصحيح
    □ Touch targets ≥ 48px
    □ Reduce Motion محترم
□ RTL/LTR Review:
    □ Arabic layout صحيح
    □ Arrow في الجهة الصحيحة
□ Localization Review:
    □ كل النصوص تأتي من i18n/CMS
    □ لا Hardcoded text
□ Offline Review:
    □ يعمل بدون اتصال
    □ يُكمل gracefully
□ Crash Safety Review:
    □ Error Boundary محيط بالجولة
    □ CrashRecoveryManager يمنع الـ Loop
□ Security Review (إذا لزم):
    □ لا PII في الـ Analytics
    □ Deep Links تُتحقق من صحتها
□ Documentation:
    □ README محدَّث
    □ كل API موثَّق
    □ أي قرار جديد مُسجَّل في ADR
□ Architecture Review:
    □ لا انحراف عن هذه الوثيقة
    □ أي انحراف موثَّق في ADR جديد
□ Regression:
    □ كل Phase السابقة لا تزال تعمل
    □ لا تغيير في سلوك AppContext الموجود
```

### 25.2 متى نُعدِّل الوثيقة

```
يجوز تعديل هذه الوثيقة فقط عند:
1. وجود سبب تقني واضح يُوثَّق في ADR
2. موافقة المسؤول عن المشروع

لا يجوز التعديل:
- أثناء sprint نشط
- بدون ADR
- لأسباب الوقت أو الراحة
```

---

## 26. Phased Implementation

> **القاعدة الذهبية:** كل Phase مكتمل + تمر عليه كل بنود Definition of Done قبل الانتقال للتالي.
> لا نبدأ كتابة النظام بالكامل مرة واحدة.

---

### Phase 1: Core Foundation + Home Tour

**المدة المقدرة:** أسبوعان
**ما يُبنى:**

```
src/guided-tour/
  ├── core/
  │   ├── TourRegistry.ts              ← تعريفات الجولات
  │   ├── TourEngine.ts               ← useReducer + دورة الحياة
  │   ├── TourContext.tsx             ← React Context
  │   ├── PersistenceManager.ts       ← AsyncStorage + userId binding
  │   ├── CooldownManager.ts          ← منطق الـ Cooldown
  │   └── CrashRecoveryManager.ts     ← Crash Safety
  │
  ├── content/
  │   ├── ContentProvider.ts          ← Static Bundle فقط (Phase 1)
  │   └── assets/tours/
  │       └── home_v1/                ← ar, en, ur, hi, bn, fil
  │
  ├── rendering/
  │   ├── SpotlightRendererInterface.ts
  │   ├── SkiaRenderer.tsx            ← Primary
  │   ├── SvgRenderer.tsx             ← Fallback
  │   └── RendererFactory.ts          ← اختيار تلقائي
  │
  ├── targeting/
  │   └── TargetResolver.ts           ← ref + testId + resolver
  │
  ├── config/
  │   └── RemoteConfigManager.ts      ← Static defaults فقط (Phase 1)
  │
  ├── flags/
  │   └── FeatureFlagsEngine.ts       ← Static defaults فقط (Phase 1)
  │
  ├── privacy/
  │   └── ConsentManager.ts           ← Consent interface
  │
  ├── di/
  │   └── PlatformContainer.ts        ← DI Container
  │
  ├── ui/
  │   ├── SpotlightOverlay.tsx
  │   ├── TourTooltip.tsx
  │   ├── TourArrow.tsx
  │   ├── StepCounter.tsx
  │   ├── SuccessCelebration.tsx
  │   └── TourErrorBoundary.tsx
  │
  ├── hooks/
  │   └── useTour.ts
  │
  └── index.ts                        ← Public API فقط
```

**الجولة المُنفَّذة:** Home Tour (4 خطوات، 6 لغات)

**Definition of Done لـ Phase 1:**
- [ ] كل البنود في المادة 25.1
- [ ] SkiaRenderer + SvgRenderer يعملان
- [ ] TargetResolver (ref + testId)
- [ ] CrashRecoveryManager يمنع الـ Loop
- [ ] Home Tour تعمل على iOS و Android
- [ ] RTL (AR/UR) و LTR (EN/HI/BN/FIL) صحيحان
- [ ] Reduce Motion محترم
- [ ] ADR-001 إلى ADR-010 مكتوبة كاملة
- [ ] docs/adr/ مُنشأ ومكتمل

---

### Phase 2: All Module Tours + Analytics + Cooldown

**المدة المقدرة:** ثلاثة أسابيع

**ما يُبنى:**
- 10 جولات إضافية (كل الوحدات)
- AnalyticsCollector (Event Queue + Batch)
- Resume Tour
- Smart Skip (3 مستويات)
- What's New Engine (basic)
- FeatureFlagsEngine (من Remote Config)

---

### Phase 3: CMS Integration + Admin Dashboard

**المدة المقدرة:** ثلاثة أسابيع

**ما يُبنى:**
- ContentProvider مع CMS integration + Caching
- Draft/Publish Workflow (Backend + Dashboard)
- Admin Dashboard (Analytics + Content Mgmt)
- Audit Logs
- Tour Version Control + Force Replay
- RemoteConfigManager (Remote API)
- Export CSV/Excel

---

### Phase 4: Advanced Features + Privacy

**المدة المقدرة:** أسبوعان

**ما يُبنى:**
- A/B Testing Engine
- Interactive Steps كاملة
- Contextual Tips Engine
- Feature Badges
- Empty State Guides
- Privacy Dashboard (Consent Management)
- Data Deletion API
- Deep Links الكاملة
- Admin Theme Overrides

---

### Phase 5: Hardening + Documentation

**المدة المقدرة:** أسبوع

**ما يُبنى:**
- AI-Personalized Hints (POC)
- Performance optimization شاملة
- Full Accessibility Audit
- كل device sizes verified
- Low memory / slow network tests
- Final regression suite
- Documentation كاملة

---

## 27. Risks & Final Recommendation

### 27.1 المخاطر المحدَّثة

| المخاطرة | الاحتمالية | التأثير | الحل |
|---------|-----------|---------|------|
| Skia لا يعمل على Android القديم | متوسطة | بصري | SvgRenderer Fallback تلقائي |
| CMS timeout يُعيق الجولة | منخفضة | UX | Static Fallback + 3s timeout |
| TargetResolver يفشل (element لم يُعرض بعد) | متوسطة | crash | retry 300ms + fallback behavior |
| Reinstall يفقد Persistence | عالية | تجربة سيئة | userId binding بدلاً من deviceId |
| نصوص CMS لبعض اللغات غير مكتملة | عالية | translation gaps | Fallback chain: locale → EN → AR |
| Draft/Publish يُبطّئ تحديث النصوص | متوسطة | workflow friction | Fast-track review option في Emergencies |
| Feature Flag تُعطِّل جولة للدولة الخطأ | منخفضة | UX gap | Preview mode في Dashboard قبل النشر |
| Crash Recovery يمنع مستخدم من الجولة | منخفضة | missed onboarding | Admin يستطيع reset يدوياً |
| Privacy Consent يمنع Analytics | متوسطة | data gap | Aggregate anonymous metrics لا تحتاج Consent |
| Deep Link يفتح URL خبيث | منخفضة | security | Domain whitelist + URL validation |

### 27.2 التوصية النهائية

```
1. هذه الوثيقة = Single Source of Truth
   أي انحراف يُوثَّق في ADR أولاً، ثم يُنفَّذ.

2. Platform Architecture — ليس Component
   الـ 12 Module تُتيح كل الـ 8 أنماط الحالية والمستقبلية.

3. Concept C (النقاء الطبي) — التصميم المعتمد
   بسيط، موثوق، أداؤه ممتاز، يليق بتطبيق طبي.

4. Phase 1 يُسلَّم مكتملاً قبل Phase 2
   لا تسوية. جودة ثابتة عبر كل الـ Phases.

5. DI من اليوم الأول
   يُوفِّر شهوراً من إعادة الكتابة مستقبلاً.

6. Privacy by Design
   لا PII، لا Analytics بدون Consent، GDPR/PDPL جاهز.

7. ADR لكل قرار كبير
   ذاكرة المشروع محفوظة — لا قرار "ضاع في الوقت".
```

---

## Signoff

> **هذه الوثيقة معتمدة نهائياً — Phase 0 v3**
>
> **Phase 1 يبدأ مباشرة بعد هذا الاعتماد.**
>
> **المخرجات الأولى لـ Phase 1:**
> 1. `src/guided-tour/` — الهيكل الكامل
> 2. DI Container + كل الـ Interfaces
> 3. SkiaRenderer + SvgRenderer + RendererFactory
> 4. TargetResolver
> 5. TourEngine + TourContext
> 6. PersistenceManager + CrashRecoveryManager
> 7. TourTooltip + SpotlightOverlay (Concept C)
> 8. Home Tour — 4 خطوات × 6 لغات
> 9. Unit Tests
> 10. docs/adr/ — ADR-001 إلى ADR-010
