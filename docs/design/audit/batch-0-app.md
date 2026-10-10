# Batch 0, patient-app: per-screen element audit

Traced from the code at `origin/design/batch-0` (`dc467ce1`), read-only. For every screen: the route file, every component, hook and util it renders or calls, the api helper, and, for each call, the backend controller route and the service that answers it. Nothing was run; "exists" is written only where the file or controller line was seen. Suspect items are listed in `docs/design/needs-review/batch-0-app.json` (referred to below as NR-n, numbered in file order).

Paths are relative to `patient-app/` unless they start with `backend/` or `packages/`. "AuthKit" is `src/components/auth/AuthKit.tsx`; "HomeParts" is `src/components/home/HomeParts.tsx`; "HomeTopRow" is `src/components/home/HomeTopRow.tsx`.

## Conventions

Source values: `API <METHOD> <path> field <name>` · `user input` · `static copy (…)` · `derived (from …)` · `device (OS permission/state)` · `config/env`.

Two api helpers exist, with different behaviour (NR-13):
- **A** `utils/api.ts` (axios `HttpClient`, `src/services/HttpClient.ts`): used by `login.tsx`, `welcome.tsx`, `useSocialLogin.ts`. Adds `Authorization` from SecureStore; on any 401 it clears the stored session unless `skipAuth`; no `Idempotency-Key`.
- **B** `src/utils/api.ts` (fetch): used by `register`, `otp`, `forgot-password`, `reset-password`, Home, `HomeSections`, `search`, `notifications`, `AppGate`. Adds `Idempotency-Key` to every POST/PUT/PATCH/DELETE; on 401 deletes the SecureStore token.

Backend: global prefix `api` (`backend/src/main.ts:172`), `/api/v1`. A controller under `@UseGuards(JwtAuthGuard)` without `@Public()` answers 401 `Missing token` when no `Authorization` header is sent (`backend/src/common/auth.guard.ts` `canActivate`, the `if (!token)` branch). The app never creates a session by itself: only the Welcome "guest" link, login, register or social login do (see Splash).

Shared pieces used by several screens (audited once here, referenced below):

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back button (form screens) | button | static copy (`رجوع`) + glyph `caret-right`/`caret-left` by `isRTL` | `router.back()` (each screen passes `onBack`) | `AuthKit.tsx:62-68` |
| Noon Dot logo + label "نبض بلس" | image | static asset component (`NabdLogo`), label static copy | none (display only) | `AuthKit.tsx:71`, `src/components/NabdLogo.tsx` |
| Title / subtitle | text | static copy (Arabic source, translated by `autoTranslate`) | none | `AuthKit.tsx:78-93` |
| Text field (label, input, hint, error) | field | user input; label/placeholder/hint static copy; `error` from the screen | none | `AuthKit.tsx:115-190` |
| Show/hide password eye | button | local state `shown` | none (toggles `secureTextEntry`) | `AuthKit.tsx:171-181` |
| Sticky footer CTA | button | static copy; label switches to `لحظة…` while `loading` | the screen's handler | per screen |
| Link / alt line | link | static copy | the screen's handler | `AuthKit.tsx:193-211` |
| Error box | text | the screen's `errorMessage` (static Arabic, or the raw `err.message` from the api helper = the server's `message`) | none | `AuthKit.tsx:214-222` |
| Language of every Arabic string | text | `autoTranslate(str, lang)` through the phrase catalogue (`src/i18n/index.ts:326`); a string not in the catalogue, such as any server message in English, is shown as is | none | `src/components/LocalizedText.tsx:11` |

---

## 1. Splash `app/index.tsx` (route `/`, opens the app)

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Noon Dot, 140, pulsing | image | static asset component | none | `app/index.tsx:46` |
| "نبض بلس" | text | static copy | none | `app/index.tsx:51-53` |
| "رعايتك الصحية المتكاملة" | text | static copy | none | `app/index.tsx:54-56` |
| 2.6 s timer | derived (setTimeout) | config (constant 2600) | `router.replace('/(tabs)')` always | `app/index.tsx:20,33` |
| Token read (`SecureStore AUTH_TOKEN`) | device | SecureStore; result discarded | none | `app/index.tsx:27` |
| Guest-mode read (`GUEST_MODE`) | device | AsyncStorage; result discarded; the key is never written anywhere in the app (grep) | none | `app/index.tsx:28` |
| Fallback | navigation | only if the AsyncStorage read rejects (the SecureStore read has its own `.catch`) | `router.replace('/(auth)/welcome')` | `app/index.tsx:35` |
| AppGate wrapper (spinner / maintenance / update) | text/button | API `GET /config` field `maintenance`, `min_version`, `message_ar` (public, `backend/src/modules/config/config.controller.ts:5-12`); fail-open | `retry` re-calls `GET /config` | `src/components/AppGate.tsx:24-63` |

Conditional: the splash never reads `ONBOARDING_DONE` (set in 3 places, read nowhere) and never routes to `/(onboarding)`; no file in `app/` or `src/` outside the onboarding folder pushes to it (grep). See NR-1, NR-2.

## 2. Onboarding intro `app/(onboarding)/intro.tsx` (`/(onboarding)/intro`)

Reachability (owner decision 6, 2026-10-10, #408): second step of the first launch. The splash (`app/index.tsx`, `launchRoute`) sends a device with no session, no Welcome shown and no `INTRO_DONE` flag to `/(onboarding)/language`; Language continues here; finishing or skipping sets `INTRO_DONE` (`@nabdah_intro_done_v1`, `src/utils/onboardingGate.ts`) and opens Welcome. The file was `index.tsx` and resolved to `/` like the splash; it is now `intro.tsx`. No permission is asked on this screen.

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Noon Dot, 30 | image | static asset component | none | `intro.tsx:104` |
| "تخطي" | button | static copy | `finish()`: `markIntroDone()` (AsyncStorage `INTRO_DONE='true'`, kept in memory if the write fails), then `router.replace('/(auth)/welcome')` | `intro.tsx:67-71,89` |
| Slides list (5) | list | static copy: `SLIDES` array (no API) | none; paging by swipe updates `index` through `onViewableItemsChanged` | `intro.tsx:38-44,111-135` |
| Slide icon + tone (x5) | icon | static: `SERVICE_ICONS.consult/pharmacy/lab/nursing`, `sparkle`/`violet` | none | `intro.tsx:39-43,125` |
| Slide title (x5) | text | static copy | none | `intro.tsx:128-130` |
| Slide body (x5) | text | static copy | none | `intro.tsx:131` |
| Dots (5) | button | derived (`index`, `SLIDES.length`); a11y label `i / 5` | `goTo(i)` (scroll to slide) | `intro.tsx:139-145` |
| Primary button "التالي" / "ابدأ رحلتك الصحية" | button | derived (`last = index === 4`) | `goTo(index+1)` or `finish()` | `intro.tsx:88,93` |
| Reduce-motion flag | device | `AccessibilityInfo.isReduceMotionEnabled` | none | `intro.tsx:59-63` |

## 3. Onboarding language `app/(onboarding)/language.tsx`

Reachability: first screen of the first launch (splash `launchRoute` -> `/(onboarding)/language`). No back button (nothing to go back to).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Logo (no back button) | image | shared (see top) | none | `language.tsx:33` |
| Title "اختر لغتك", subtitle | text | static copy | none | `language.tsx:34` |
| Language list (6 rows) | list | static: `LANGUAGES` (`src/context/AppContext.tsx:22-35`) | none | `language.tsx:38-50` |
| Row label (native name) | text | static (`l.native`) | none | `language.tsx:40` |
| Row meta (English name) | text | static (`l.label`) | none | `language.tsx:41` |
| Row selected state | icon | derived (`lang` from the app context = AsyncStorage `@nabdah_language`, else device language, else `ar`: `AppContext.tsx:43-49,72,102-106`) | tap calls `setLang(code)` at once (saved, `LanguageManager` synced, RTL for ar/ur set by the context) | `language.tsx:19,43-44` |
| Continue "متابعة" | button | static copy | `router.replace('/(onboarding)/intro')` (the language is already applied) | `language.tsx:20,25` |

## 4. Onboarding permissions: removed (owner decision 6, 2026-10-10)

`app/(onboarding)/permissions.tsx` is deleted. Nothing in `app/(onboarding)` asks for a permission (a test scans the folder). Each feature asks at the moment of use: camera (prescription photo, barcode, insurance card, family QR), photo library (attachments, profile photo, returns), location (nearby doctors, map, SOS, address picker) already did; notifications now ask from `NotificationAsk` on the pharmacy offers screen (`app/pharmacy/broadcast-status.tsx`) and on the notification settings (`SettingsViews.tsx`), and the app start (`NotificationHandler`) only registers the push token when notifications are already allowed.

## 5. Welcome `app/(auth)/welcome.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Language pill (globe, native name, caret) | button | derived (`LANGUAGES.find(lang).native`; `lang` as in 3) | opens the language menu | `welcome.tsx:144-156,124` |
| Language menu (6 items, order ar,en,ur,hi,fil,bn) | list | static (`LANG_ORDER`, `LANGUAGES`) | tap: `setLang(code)` (persisted) and close | `welcome.tsx:29,188-227` |
| Menu item tick | icon | derived (`lang === code`) | none | `welcome.tsx:208,221` |
| Menu backdrop "إغلاق" | button | static copy | closes the menu | `welcome.tsx:189` |
| Theme switch (3: تلقائي / فاتح / غامق) | button | static glyphs/labels; selected = `themeMode` (AsyncStorage `@nabdah_theme_mode`, default `system`) | `setThemeMode(mode)` (persisted) | `welcome.tsx:32-36,158-185`, `AppContext.tsx:40,88-124` |
| Four service tiles (pill, stethoscope, test-tube, first-aid-kit) | icon | static | none (display only) | `welcome.tsx:41-46,233-250` |
| Noon Dot, 150 | image | static asset component | none | `welcome.tsx:251` |
| Wordmark "نبض+" / "Nabd+" | text | derived (`lang === 'ar'` picks the word) + static `+` | none | `welcome.tsx:257-260` |
| ECG line | image | static path | none | `welcome.tsx:38,261-263` |
| Tagline "رعايتك الصحية المتكاملة" | text | static copy | none | `welcome.tsx:264-266` |
| Social buttons: Apple (iOS only), Google, X, Snapchat | button | config: `availableSocialProviders()` (`Platform.OS`) | `useSocialLogin().signIn(p)`: provider SDK, then `POST /auth/social-login` `{provider, token, email?, name?}` (`useSocialLogin.ts:69`; controller `backend/src/modules/auth/auth.controller.ts:321-325`, DTO `auth.dto.ts:208-225`). Disabled while `social.busy \|\| guestBusy` | `welcome.tsx:117-122,272`, `AuthKit.tsx:270-364` |
| Social result | navigation | API `POST /auth/social-login` field `token.accessToken` (or string `token`) | success: `replace('/(tabs)')`, or `replace('/(auth)/provider-info')` when the JWT role is not `patient`; failure: error text | `useSocialLogin.ts:63-85` |
| Create account button | button | static copy | `router.push('/(auth)/register')` | `welcome.tsx:275,52-56` |
| Sign in button | button | static copy | `router.push('/(auth)/login')` | `welcome.tsx:278` |
| Guest link "المتابعة كضيف" / "لحظة…" | button | static copy; busy state | `POST /auth/guest` body `{}` + header `x-device-id` (device id: AsyncStorage `@nabdah_device_id`, `src/utils/deviceId.ts`) (controller `auth.controller.ts:175-180`); then `storeAuthSession(res.token)`, redux `guestLogin`, `router.replace('/(tabs)')` | `welcome.tsx:65-90,281-293` |
| Guest link chevron | icon | derived (`isRTL`) | none | `welcome.tsx:292` |
| Error line | text | static copy (`تعذّرت المتابعة كضيف…`) or `social.error` (`SOCIAL_UNAVAILABLE` / `SOCIAL_FAILED`, `useSocialLogin.ts:22-23`) | none | `welcome.tsx:86,294-298` |

Conditional: Apple button hidden off iOS; error line hidden when null; entrance animation skipped when reduce-motion is on (`welcome.tsx:93-114`). Welcome is reached only from onboarding permissions and the logout paths (`app/settings/index.tsx:90`, `app/profile/index.tsx:34`) and the splash fallback. The social buttons are the same code as on Login (NR-16, NR-17). The language and theme choices are written to AsyncStorage by `AppContext` (`@nabdah_language`, `@nabdah_theme_mode`).

## 6. Login `app/(auth)/login.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, logo, title, subtitle | button, image, text | shared; static copy | `router.back()` | `login.tsx:131-132` |
| Identifier field (email or phone) | field | user input (`phone` state) | none | `login.tsx:135-145` |
| Password field + eye | field | user input | none | `login.tsx:146-154` |
| "نسيت كلمة المرور؟" | link | static copy | `router.push('/(auth)/forgot-password')` | `login.tsx:156` |
| Error box | text | derived: local validation messages (`login.tsx:48,52,56,75`), the lockout message, the thrown `err.message` (server `message`, e.g. English `Invalid credentials`), or `social.error` | none | `login.tsx:158` |
| Submit "تسجيل الدخول" / "لحظة…" | button | static copy | `POST /auth/login` (controller `auth.controller.ts:149-172`). Body from `loginCredentials()`: an `@` goes as `identifier` (lower-cased), otherwise `phone` = `+966` + digits without leading zeros (`src/utils/login-credentials.ts:5-9`; DTO `AuthLoginDto` fields `identifier`, `email`, `phone`, `password`: `auth.dto.ts:101-118`) | `login.tsx:60-101,113-122` |
| Login result | navigation | API `POST /auth/login` field `token.accessToken` / `token.refreshToken` (`signToken`, `auth.service.ts:50-62`); both stored with `storeAuthSession` (`utils/api.ts:103-120`) | `replace('/(auth)/provider-info')` if the JWT `role` is not `patient`, else `replace('/(tabs)')`. A response without a token (admin accounts get `requires_2fa`/`requires_passkey`) shows `تحقق من البيانات وحاول مجدداً` and counts an attempt | `login.tsx:66-90`, `auth.service.ts:556-640` |
| Lockout (5 tries, 5 min) | derived | local state only (`attempts`, `lockoutUntil`); resets when the screen remounts | none | `login.tsx:26-27,39,46-49,70-73,94-97` |
| Divider "أو تابع عبر" | text | static copy | none | `login.tsx:123` |
| Social icon buttons (Apple iOS only, Google, X, Snapchat) | button | config (`Platform.OS`) | `POST /auth/social-login` as in Welcome | `login.tsx:103,124`, `AuthKit.tsx:313-340` |
| Alt line "ليس لديك حساب؟ إنشاء حساب" | link | static copy | `router.push('/(auth)/register')` | `login.tsx:125` |

Conditional: Submit and social disabled while `loading \|\| social.busy`. A 401 from `POST /auth/login` runs `clearStoredSession()` in helper A (NR-11). The login does not dispatch redux `loginSuccess` (NR-12). Identifier validation is `length < 9` (NR-14); server messages are shown raw in English (NR-15). `useSocialLogin` is mounted here and in Welcome, so the Google/X/Snapchat request hooks run at render with the env client ids (NR-16); what the backend does with the social token is NR-17.

## 7. Register `app/(auth)/register.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, logo, title, subtitle | shared | static copy | `router.back()` | `register.tsx:96-97` |
| Full name field | field | user input; placeholder "كما في الهوية" static | none | `register.tsx:100-109` |
| Email field + hint "نرسل عليه رمز التأكيد وفواتيرك" | field | user input; hint static | none | `register.tsx:110-121` |
| Phone field with `+966` chip + hint | field | user input (digits only: `replace(/\D/g,'')`); chip static | none | `register.tsx:122-134` |
| Password field + hint "٦ أحرف على الأقل" | field | user input | none | `register.tsx:135-144` |
| Confirm password field | field | user input | none | `register.tsx:145-153` |
| Terms checkbox | field | user input (`agreed`) | none | `register.tsx:154` |
| "الشروط والأحكام" link | link | static copy | `router.push('/(auth)/terms')` (exists: `app/(auth)/terms.tsx`) | `register.tsx:157` |
| "سياسة الخصوصية" link | link | static copy | `router.push('/(auth)/privacy')` (exists: `app/(auth)/privacy.tsx`) | `register.tsx:159` |
| Error box | text | derived: local validation (name ≥3, phone ≥9, email has `@`, password ≥6, match, `agreed`) or the server `message` | none | `register.tsx:31-40,162,67` |
| Submit "إنشاء الحساب" | button | static copy | `POST /auth/send-otp` `{email, purpose:'register'}` (helper B; controller `auth.controller.ts:290-297`, DTO `SendOtpDto` `auth.dto.ts:153-169`); then `createRegistrationTransaction({fullName, phone: '+966…', email, password})` (in memory, 10 min, `src/services/auth/RegistrationTransaction.ts`); then `router.push({'/(auth)/otp', params:{transactionId, mode:'register'}})` | `register.tsx:42-70,80-89` |
| Alt line "لديك حساب؟ تسجيل الدخول" | link | static copy | `router.push('/(auth)/login')` | `register.tsx:90` |

Conditional: the OTP step is opened even if the email or phone already has an account; the backend only answers "already registered" at `POST /auth/register` after the code is entered (NR-18).

## 8. OTP `app/(auth)/otp.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, logo | shared | | `router.back()` | `otp.tsx:198` |
| Title "تأكيد البريد الإلكتروني" / "تأكيد رقم الجوال" | text | derived (`identifier.includes('@')`) | none | `otp.tsx:170-171,199` |
| Subtitle "أرسلنا رمزًا من ٦ أرقام إلى" + identifier | text | static copy + route params (`email` from the register transaction or `params.email`; phone from the transaction or `params.phone`, never passed by any caller) | none | `otp.tsx:25-28,200-205` |
| 6 digit boxes | field | user input | none | `otp.tsx:210-244` |
| Countdown "m:ss" | number | derived (state `timer`, 60 → 0, local clock) | none | `otp.tsx:34,37-42,172,254-256` |
| Hint "لم يصلك الرمز؟ راجع مجلد الرسائل غير المرغوبة" | text | static copy; shown while `timer > 0` | none | `otp.tsx:249-253` |
| "إعادة إرسال الرمز" link | link | static copy; shown when `timer === 0`; disabled while `resending` | `POST /auth/send-otp` `{identifier}` (no `purpose`), then timer 60 and boxes cleared; failure: alert | `otp.tsx:55-75,258-262` |
| Confirm "تأكيد" / "لحظة…" | button | static copy | `POST /auth/verify-otp` `{email, code}` (controller `auth.controller.ts:299-305`, DTO `VerifyOtpDto` `auth.dto.ts:170-186`; field `ok`). Then by `mode` (below) | `otp.tsx:83-168,182-191` |
| mode `register` after verify | navigation | `POST /auth/register` `{full_name, phone, email, password}` (controller `auth.controller.ts:131-147`, legacy branch `auth.service.ts:485-545`, which needs the single-use "verified" marker the previous verify left, 10 min); response `user`, `token.accessToken`; token stored with `SecureStore.setItemAsync(AUTH_TOKEN)` (refresh token dropped), `ONBOARDING_DONE`, redux `loginSuccess({user, token})`, then `replace('/(auth)/provider-info')` or `replace('/(tabs)')` by JWT role | `otp.tsx:113-161` |
| mode `reset` after verify | navigation | none | `router.replace({'/(auth)/reset-password', params:{email}})` | `otp.tsx:108-112` |
| mode `login` (default when `mode` is absent) | navigation | no caller passes it; with no token in the verify response it ends in `رمز غير صحيح أو الحساب غير موجود` | none | `otp.tsx:24,130-141` |
| Alt "تغيير البريد الإلكتروني" / "تغيير رقم الجوال" | link | derived (`byEmail`) | `router.back()` | `otp.tsx:192` |
| Alerts (`خطأ` + message) | text | static copy or the server `message` | none | `otp.tsx:59,71,86,115,131,138,148,164` |

Conditional: the register payload is consumed once (`consumeRegistrationTransaction` inside a `useState` initializer); a remount loses it and the confirm shows `انتهت مهلة التسجيل` (`otp.tsx:25-27,114-118`). The 6-digit code length is checked locally (`otp.tsx:84-88`). Resend sends no `purpose` (NR-19); in `reset` mode the verify consumes the code that the next screen asks for again (NR-20); the register path keeps only the access token and `mode=login` has no caller (NR-21).

## 9. Forgot password `app/(auth)/forgot-password.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, logo, title, subtitle | shared | static copy | `router.back()` | `forgot-password.tsx:61-62` |
| Email field | field | user input | none | `forgot-password.tsx:64-74` |
| Submit "إرسال رمز التحقق" | button | static copy | `POST /auth/send-otp` `{identifier: email}` (helper B), then `router.push({'/(auth)/otp', params:{email, mode:'reset'}})`. With an empty email or no `@` it returns without any message | `forgot-password.tsx:14-35,45-54` |
| Alt "العودة لتسجيل الدخول" | link | static copy | `router.back()` | `forgot-password.tsx:55` |
| Error alert | text | the server `message` or static `فشل إرسال رمز التحقق` | none | `forgot-password.tsx:32` |

Conditional: the backend answers `{ok:true}` for an unknown email without sending anything (`auth.service.ts:956-960`, by design, no account enumeration), so the screen always proceeds to the OTP step. The button does nothing, with no message, when the email has no `@` (NR-22).

## 10. Reset password `app/(auth)/reset-password.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Back, logo, title, subtitle | shared | static copy | `router.back()` | `reset-password.tsx:181-182` |
| Code field "رمز التحقق" | field | user input | none | `reset-password.tsx:184-194` |
| New password field + hint | field | user input | none | `reset-password.tsx:195-204` |
| Confirm field + mismatch error | field | user input; error derived (`confirmPw` non-empty and `!== pw`) | none | `reset-password.tsx:157,205-214` |
| Submit "حفظ كلمة المرور" | button | static copy | `POST /auth/reset-password` `{identifier: email(route param), password, code}` (controller `auth.controller.ts:309-318`; DTO `ResetPasswordDto` `auth.dto.ts:187-207`); returns silently when password < 6, mismatch or empty code | `reset-password.tsx:99-117,166-175` |
| Done state: check icon, title "تم تغيير كلمة المرور", text | icon, text | static copy; shown when the POST succeeds | none | `reset-password.tsx:119-153` |
| Done button "تسجيل الدخول" | button | static copy | `router.replace('/(auth)/login')` | `reset-password.tsx:126-134` |
| Error alert | text | the server `message` or static | none | `reset-password.tsx:114` |

Conditional: the server verifies the code again inside `resetPassword` (`auth.service.ts:1045-1060`); the OTP step already consumed it (NR-20, NR-23). The submit returns silently on a short password, an empty code or a mismatch, and a missing `email` param sends an empty identifier (NR-23).

## 11. Home `app/(tabs)/index.tsx` (tab, URL `/`)

Loads on focus (`useFocusEffect`) and on pull-to-refresh, `Promise.allSettled` over 7 calls with helper B (`index.tsx:65-87`); `GET /content/home` is called by `HomeSections`. All endpoints below were seen: `GET /users/me/profile` (`users.controller.ts:34-37`, `getPatientProfile` returns the `patient_profiles` document, `users.service.ts:95-101`), `GET /health/reminders` (`health.controller.ts:58-59`), `GET /nutrition/daily-summary` (`nutrition.controller.ts:50-52`), `GET /maternity/profile` (`maternity.controller.ts:21-24`), `GET /mental-health/mood?days=1` (`mental-health.controller.ts:30-34`), `GET /health/vitals/summary` (`health.controller.ts:33-34`), `GET /home/upcoming-appointment` (`home.controller.ts:15-18`), `GET /content/home` (public, `admin-governance-controls.controller.ts:257-270`). Every one except `/content/home` is JWT-only (NR-5).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Profile avatar | button | derived (first word of the name below; initials, else a user glyph; no photo is passed) | `router.push('/profile')` | `HomeTopRow.tsx:41-43,36`, `packages/ui-native/src/components/Surfaces.tsx:358-398` |
| Language button ("ع"/"EN"/…) | button | derived (`LANG_SHORT[lang]`) | opens the language sheet | `HomeTopRow.tsx:24,45-52` |
| Language sheet (6 rows + backdrop close) | list | static (`LANG_ORDER`, `LANGUAGES`); tick derived from `lang` | tap: `setLang(code)` and close | `HomeTopRow.tsx:93-147` |
| Dark-mode switch | button | derived (`isDark`) | `toggleTheme()` (persisted) | `HomeTopRow.tsx:53-75`, `AppContext.tsx:126-134` (NR-7) |
| Bell button | button | static copy (`الإشعارات`) | `router.push('/notifications')` | `HomeTopRow.tsx:77` |
| Bell unread dot | icon | derived (redux `notifications.unreadCount`; no code dispatches the slice's actions, so it is always 0 and the dot never shows) | none | `HomeTopRow.tsx:35,78-85`, `src/store/slices/notificationsSlice.ts:21-39` (NR-3) |
| Greeting card: time greeting | text | derived (device hour: `صباح الخير` 05-11, else `مساء الخير`) | none | `HomeParts.tsx:70-71,79,83` |
| Greeting card: name | text | API `GET /users/me/profile` field `full_name` (fallbacks `name`, `display_name` do not exist in the patient profile schema, `backend/src/schemas/patient-profile.schema.ts:6-60`); hidden when empty | none | `index.tsx:95`, `HomeParts.tsx:77-82` (NR-6) |
| Greeting card: Noon Dot + ECG line | image | static | none | `HomeParts.tsx:86-88,43-65` |
| Load-error banner + "إعادة المحاولة" | text, button | derived (`failed > 0 && !loading`: count of rejected calls); copy `healthDayT('error'/'retry')` (`src/i18n/health-day.ts`) | `load(true)` | `index.tsx:56,83,133`, `HomeParts.tsx:94-104` |
| Reminder card: skeleton while loading | image | derived (`loading`) | none | `index.tsx:134` |
| Reminder card: label "تذكير صحي" | text | static copy | none | `index.tsx:134` |
| Reminder card: title | text | API `GET /health/reminders` fields `medicine_name_ar` / `medicine_name_en` of the first pending dose (sorted by `time_key` string, not compared with the clock), else `healthDayT('medications')`; when no dose is pending but reminders are active: `healthDayT('allCaughtUp')` | `router.push('/health/medication-reminder-list')` | `index.tsx:89-106,96` |
| Reminder card: subtitle | text | API fields `dose` + `today_doses[].time_key` (server `health.service.ts:387-403`); when all done: derived `{taken} من {scheduled}` from `today_doses[].status` | same | `index.tsx:102,105` |
| Reminder card: hidden | | when there are no active reminders (`activeCount` 0) or the call failed | | `index.tsx:104-106` |
| Service grid, 9 tiles (consult, pharmacy, lab, nursing, nutrition, maternity, map, health, emergency) | list | static: `HOME_SERVICES` | routes below | `src/features/home/homeItems.ts:4-14`, `HomeParts.tsx:134-155` |
| Tile icon/tone (x9) | icon | static map `SERVICE_ICONS[name]` | | `Surfaces.tsx:295-330` |
| Tile label (x9) | text | static copy | | `homeItems.ts:5-13` |
| Tile routes (x9) | navigation | static | `/(tabs)/consultations`, `/(tabs)/pharmacy`, `/(tabs)/diagnostics`, `/(tabs)/nursing`, `/nutrition/hub`, `/maternity/hub`, `/map`, `/(tabs)/health`, `/emergency/sos`; all files exist (`app/(tabs)/consultations/index.tsx`, `pharmacy.tsx`, `diagnostics.tsx`, `nursing.tsx`, `health.tsx`, `nutrition/hub.tsx`, `maternity/hub.tsx`, `map/index.tsx`, `emergency/sos.tsx`) | `homeItems.ts:5-13` |
| AI assistant card (title, tag "مدعوم بالذكاء الاصطناعي", line, round chevron) | button | static copy | `router.push('/ai-assistant')` (exists: `app/ai-assistant.tsx`) | `HomeParts.tsx:158-184`, `index.tsx:136` |
| AI tools row, 5 tiles | list | static: `HOME_TOOLS` | `/ai/symptom-checker`, `/ai/prescription-translator`, `/ai/skin-analysis`, `/ai/chat-doctor`, `/ai/monthly-report`; all exist under `app/ai/` | `homeItems.ts:17-23`, `HomeParts.tsx:194-230` |
| Tool icon, tone, label (x5) | icon, text | static | | `homeItems.ts:18-22` |
| "كل الخدمات" row (title, line, chevron) | button | static copy | `router.push('/services')` (two files claim it: NR-8) | `HomeParts.tsx:233-254`, `index.tsx:138` |
| Next appointment block | list | API `GET /home/upcoming-appointment` (server `home.service.ts:49-84`: first `PENDING`/`CONFIRMED` appointment of the user with `slot_start` ≥ now); hidden when the response is empty, or has none of `doctorName`, `type`, `time`, `date` | | `index.tsx:120,139-144` |
| - section title "موعدك القادم", link "كل المواعيد" | text, link | static copy | `router.push('/consultations/appointments')` (exists) | `index.tsx:141` |
| - date block (day, month) | number | API field `date` (`YYYY-MM-DD`), formatted with `Intl` in the UI language; hidden if not parseable | none | `HomeParts.tsx:268-296` |
| - doctor name | text | API field `doctorName` (server reads `provider_profiles.name`, a field the schema does not declare; `name_ar`, `name_en`, `display_name_ar` are the declared ones); hidden when null (NR-36) | none | `HomeParts.tsx:299` |
| - type and time line | text | API fields `type` (Arabic text built by the server: `استشارة في العيادة` / `استشارة فيديو` / `زيارة منزلية`) and `time` (server `toLocaleTimeString('ar-EG')`), joined with `·` | none | `HomeParts.tsx:288,300`, `home.service.ts:61-66` |
| - "التفاصيل" button | button | static copy | `router.push({'/consultations/appointment-detail', params:{id}})`; the screen reads `appointmentId` (NR-4); with no `id`, `router.push('/(tabs)/consultations')` | `index.tsx:119,142`, `HomeParts.tsx:302` |
| Health records card (title `healthRecords`) | list | derived rows below; whole card hidden when no row | | `index.tsx:111-117`, `HomeParts.tsx:317-337` |
| - nutrition row | list item | API `GET /nutrition/daily-summary` fields `meals_count`, `water.consumed_ml` (server `nutrition.service.ts:193-238`); shown when either > 0; subtitle `{count} وجبات مسجلة · {count} مل مسجل` | `router.push('/nutrition/daily-tracker')` (exists) | `index.tsx:108-113` |
| - vitals row | list item | API `GET /health/vitals/summary` (array; server `health.service.ts:142-165`); shown when length > 0; subtitle is the static `محدّث من سجلاتك` (no date or value) | `router.push('/health/vitals')` (exists) | `index.tsx:115` |
| - mood row | list item | API `GET /mental-health/mood?days=1` (array; server `mental-health.service.ts:114-122`); shown whenever the call succeeded (even with no entry); subtitle derived from `logged_at` vs today: `moodLogged`/`moodNotLogged` | `router.push('/mental-health/mood-journal')` (exists) | `index.tsx:110,116` |
| - maternity row | list item | API `GET /maternity/profile` fields `profile_ready`, `is_pregnant` (server `maternity.service.ts:43-53`); shown when `profile_ready`; subtitle `maternityPregnancy`/`maternityCycle` | `router.push('/maternity/hub')` (exists) | `index.tsx:117` |
| - row icons | icon | static map (`bowl-food`, `heartbeat`, `brain`, `baby`) | | `HomeParts.tsx:339-344` |
| Curated sections (`HomeSections`) | list | API `GET /content/home` field `sections[]`; kept when `enabled !== false` and `items` not empty; hidden entirely when none, or the call fails | | `src/components/HomeSections.tsx:19-37` |
| - section title | text | API `sections[].title_ar` (`title_en` is read but the backend save never writes it, `admin-governance-controls.controller.ts:55-60`); hidden if empty | none | `HomeSections.tsx:36,41,44` |
| - card (236 wide) | list item | API `items[]` | tap: `router.push(items[].deep_link)` when set (free text typed by an admin, not checked against app routes); disabled when no `deep_link` | `HomeSections.tsx:52-84` (NR-10) |
| - card image | image | API `items[].image_url` through `expo-image`; fallback: static `tag` glyph | none | `HomeSections.tsx:72-77` |
| - card title | text | API `items[].title_ar`; hidden if empty | none | `HomeSections.tsx:78-82` |
| Points card ("نقاط نبض+", "تخصم حتى ١٠٪ من قيمة طلبك") | button | static copy only; no API call, no number shown | `router.push('/loyalty/hub')` (exists: `app/loyalty/hub.tsx`) | `HomeParts.tsx:347-367`, `index.tsx:147` (NR-9) |
| Pull-to-refresh | derived | `refreshing` | `load(true)` | `index.tsx:128` |

## 12. Tab bar `app/(tabs)/_layout.tsx` + `src/components/navigation/MainTabBar.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Floating bar | list | static: `MAIN_TAB_ITEMS` (5); label "التنقل الرئيسي" | | `MainTabBar.tsx:51-57,80-98` |
| Tab "الرئيسية" (house) | button | static | `router.push('/(tabs)')` | `MainTabBar.tsx:52` |
| Tab "الصيدلية" (pill) | button | static | `router.push('/(tabs)/pharmacy')` | `MainTabBar.tsx:53` |
| Tab "الاستشارات" (stethoscope, raised coral) | button | static | `router.push('/(tabs)/consultations')` | `MainTabBar.tsx:54` |
| Tab "التحاليل" (test-tube) | button | static | `router.push('/(tabs)/diagnostics')` | `MainTabBar.tsx:55` |
| Tab "التمريض" (first-aid-kit) | button | static | `router.push('/(tabs)/nursing')` | `MainTabBar.tsx:56` |
| Current-tab pill (ink, with label) | derived | `usePathname()` through `activeMainTab`; no tab is current on `/services` and `/health` | none | `MainTabBar.tsx:60-67,78,89` |
| Header per tab | derived | `Home` and `services` turn the shared `<Header />` off, the other tabs keep it | none | `app/(tabs)/_layout.tsx:9-27` |

All five target files exist (`app/(tabs)/…`, seen). There is no tab for `/(tabs)/services` or `/(tabs)/health`: they are reachable only by the Home tiles and the Services rows.

## 13. Services tab `app/(tabs)/services.tsx`

Reachability: the tab bar has no entry for it, and `/services` is also claimed by `app/services/index.tsx` (NR-8).

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Title "الخدمات" | text | static copy | none | `services.tsx:29` |
| "طلباتي" pill | link | static copy | `router.push('/orders')` (exists: `app/orders/index.tsx`) | `services.tsx:30-38` |
| Search pill "ابحث عن خدمة أو طبيب أو دواء" | link | static copy | `router.push('/search')` (it is a button, not a field: no focus) | `services.tsx:41-49` |
| Section "الخدمات الرئيسية" | text | static copy | none | `services.tsx:52` |
| Four tiles (lab, nursing, radiology, maternity) | list | static: `MAIN_SERVICES`; 2 across on a phone, 4 on a tablet (`useWindowDimensions >= 768`) | `/(tabs)/diagnostics`, `/(tabs)/nursing`, `/diagnostics/packages`, `/maternity/pregnancy-tracker`; all exist | `src/features/services/catalog.ts:193-198`, `services.tsx:54-66` |
| Tile icon/tone, title | icon, text | static (`SERVICE_ICONS`; titles `التحاليل المخبرية`, `التمريض المنزلي`, `الأشعة التشخيصية`, `رعاية الأمومة`) | | `catalog.ts:194-197` |
| Tile badge "جديد" (nursing only) | text | static copy | none | `catalog.ts:195` |
| Section "خدمات إضافية" | text | static copy | none | `services.tsx:70` |
| 6 rows (`MORE_SERVICES`) | list | static; each row = icon, title, description | `/emergency/sos`, `/consultations/specialty-select` (x2), `/mental-health/hub`, `/nutrition/hub`, `/(tabs)/nursing`; all exist | `catalog.ts:201-208`, `src/components/home/ServiceRows.tsx:130-149` |
| Row titles/descriptions (x6) | text | static copy | none | `catalog.ts:202-207` |

The eye and dentistry rows both open the same unfiltered specialty list (NR-24).

## 14. All services `app/services/index.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header "كل الخدمات" + back | text, button | static copy | `router.back()` | `services/index.tsx:97-99` |
| 5 groups (الرعاية الطبية 6, صحتي 4, أدوات الذكاء الاصطناعي 3, العائلة والمجتمع 5, حسابي وخدماتي 5) | list | static: `SERVICE_GROUPS` (23 rows) | | `catalog.ts:211-260`, `services/index.tsx:102-104`, `ServiceRows.tsx:152-160` |
| Group titles (x5) | text | static copy | none | `catalog.ts:213,224,233,241,251` |
| Row title, description, icon, tone (x23) | text, icon | static copy | none | `catalog.ts:215-257` |
| Row routes (x23) | navigation | static | `/(tabs)/consultations`, `/(tabs)/diagnostics` (x2: lab, radiology), `/(tabs)/nursing`, `/emergency/sos`, `/(tabs)/pharmacy`, `/(tabs)/health`, `/health/smart-reminders`, `/reports/view-report`, `/health/medication-reminder-list`, `/ai/symptom-checker`, `/ai/prescription-translator`, `/ai/monthly-report`, `/nutrition/hub`, `/maternity/hub`, `/mental-health`, `/community/hub`, `/family`, `/orders`, `/insurance`, `/loyalty/hub`, `/offers`, `/map`; all files seen. `/reports/view-report` without an `id` opens its error state (`reports/view-report.tsx:65-69`) | `catalog.ts:215-257` |

Two rows go somewhere other than their label says: "الأشعة والتصوير" opens the lab tab, and "المساعد الطبي الذكي" opens the symptom checker while the Home card of the same name opens `/ai-assistant` (NR-24).

## 15. Search `app/search/index.tsx`

`SearchRoute` picks one of three screens by the query params (`search/index.tsx:459-464`).

### 15a. Global search (no `view`)

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Search field | field | user input; initial value from route param `q`; placeholder, label static copy | none | `search/index.tsx:284,369-381` |
| Clear (x) | button | shown when the field is non-empty | clears the query | `search/index.tsx:375`, `packages/ui-native/src/components/Inputs.tsx:360-371` |
| Scan button | button | static copy (`ماسح الأدوية`) | `router.push('/pharmacy/barcode-scanner')` (exists) | `search/index.tsx:377`, `Inputs.tsx:372-` |
| "إلغاء" | button | static copy | `router.back()`, else `router.replace('/(tabs)')` | `search/index.tsx:358-361,383-385` |
| Query call | | user input after a 500 ms debounce, `term = query.trim()` | `GET /home/search?q=<term>` (helper B; controller `home.controller.ts:20-23`, JWT-only; server `home.service.ts:92-270`); a stale answer is dropped | `search/index.tsx:318-344` |
| Filter chips (All + the kinds present) with counts | list | derived: `FILTERS` (static labels) ∩ kinds in the results; counts from `countByFilter(rows)`; the row is shown only with a query that was answered with ≥1 result | tap: `setFilter(key)`; a chip whose kind vanishes falls back to "All" | `searchResults.ts:47-59,89-93`, `search/index.tsx:346-352,387-395` |
| Result blocks (8: أدوية ومنتجات, أطباء, تحاليل وأشعة, عروض, مقالات ومعلومات, تأمين, مجتمع, عائلة) | list | derived from the results by `type` (`SECTIONS`, static titles); only blocks with rows; under "All" a list block shows its first 3 rows, doctors 6 | | `searchResults.ts:72-110`, `search/index.tsx:151-194` |
| Block action "الكل (n)" | link | derived (`n` = rows of that kind); hidden for blocks that mix two kinds (tests/imaging, articles/diseases) and when all rows are shown | `setFilter(kind chip)` | `search/index.tsx:157-163` |
| Result row (medicines, tests/imaging, other) | list item | API `GET /home/search` item; per field below | `router.push(routeFor(r))`; nothing if the item has no `id` | `search/index.tsx:73-121,354-357` |
| - icon + tone | icon | derived from `type` (`TYPE_ICON`, static); the server's `ic`, `c`, `cs` are ignored | | `searchResults.ts:25-38` |
| - name | text | API `name` (`nameEn` in non-Arabic); the matched part is bold | | `search/index.tsx:76,114` |
| - sub | text | API `sub` / `subEn` (the server builds it: active ingredient/manufacturer, specialty, `short_code`, body part, category, provider name, "N إعجاب · N تعليق", relation) | | `search/index.tsx:77,115`, `home.service.ts:155-267` |
| - price + "ر.س" | number | API `price` / `priceEn` (string); hidden when empty or 0; the currency is static copy | | `search/index.tsx:55-58,79-83` |
| - "إعلان" chip | text | API `sponsored` (only package results carry it: `c.target_parameters.sponsored`) | | `search/index.tsx:113` |
| Doctor card (252 wide) | list item | same API item (`type` = `دكتور`); filled stethoscope, name, specialty (`sub` = `specialty`), price = `price_clinic`; no photo or rating shown (the server also sends `rate`, unused) | `router.push('/consultations/doctor/<id>')` (exists: `consultations/doctor/[id].tsx`) | `search/index.tsx:124-149`, `home.service.ts:169-181` |
| Result routes | navigation | static map: دكتور `/consultations/doctor/:id`; دواء `/pharmacy/product-detail?id`; تحليل `/diagnostics/test-detail?id`; أشعة same with `type=radiology`; مقال/مرض `/articles/:slug`; مجتمع `/community/post-detail?id`; عائلة `/family/member-health?id`; باقة `/(tabs)/health` (no id passed); تأمين `/insurance/hub` (no id passed). All files exist and read the param (`id`, `slug`) | | `searchResults.ts:113-129` (NR-28) |
| Upload card "لم تجد ما تبحث عنه؟ ارفع الوصفة وتبحث الصيدليات عنه لك" + "رفع الوصفة" | link | static copy; shown after results and in the empty state | `router.push('/pharmacy/scan-prescription')` (exists) | `search/index.tsx:197-212` |
| No query: "عمليات البحث الأخيرة" list + "مسح" | list, button | device: AsyncStorage `@nabdah_recent_searches` (max 8, saved after each answered query ≥2 chars); hidden when empty | row tap: `setQuery(q)`; "مسح": removes the key | `search/index.tsx:35-36,295-315,240-255` |
| No query: "تصفّح حسب القسم" grid (8) | list | static: `BROWSE` | `/(tabs)/pharmacy`, `/(tabs)/consultations`, `/(tabs)/diagnostics` (x2: تحاليل, أشعة), `/(tabs)/nursing`, `/mental-health`, `/nutrition/hub`, `/family`; all exist | `search/index.tsx:40-49,257-276` |
| Loading skeleton | image | derived (`answered !== term`) | none | `search/index.tsx:415-420` |
| Empty state "لا توجد نتائج" | text | derived (`answered === term` and 0 rows) | none | `search/index.tsx:421-427` |
| Error / offline state + "إعادة المحاولة" | text, button | derived (`failed`; offline from `NetInfo`, `src/utils/isOffline.ts`) | `setNonce(n+1)` (re-run the call) | `search/index.tsx:403-414` |

Without a session (no token) the call answers 401 and the error state is shown (NR-29).

### 15b. `?view=doctors` (`DoctorSearchView`, entered through `app/consultations/doctor-search.tsx`)

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Title "البحث عن طبيب", back | text, button | static copy | `router.back()` | `src/components/views/DoctorSearchView.tsx:118-128` |
| Search input | field | user input; initial value from param `specialty` (used as free text, not as the `specialty` filter) | `handleSearch` is never wired to the input (filtering is also done locally) | `DoctorSearchView.tsx:28,92-94,131-136` |
| Sort chips (الأعلى تقييماً, الأقل سعراً, الأقل انتظاراً) | button | static | `fetchDoctors(query, sort)` | `DoctorSearchView.tsx:137-160,87-89` |
| Doctor list | list | `GET /care/doctors?search=<q>&sort=<rating\|price\|wait>` (controller `care.controller.ts:29-58`, public; it reads `q` and `sort` in `rating`, `price_asc`, `price_desc`, `experience`, `distance_*`, and answers `{page, limit, total, items[]}`); the screen reads `res.data` or an array, so it always gets `[]` | | `DoctorSearchView.tsx:44-52` (NR-25, NR-26) |
| Item fields | text | the mapping reads `name_ar`, `degree`, `specialty_ar`, `consultation_fee`, `average_wait`, `offers_*`, `facility_name`, `next_available_slot`; the server sends `name_ar`, `title`, `specialty`, `price_clinic/online/home`, `consultation_modes[]`, `hospital`, `next_available_at` | `/consultations/doctor/[id]`, `/consultations/book/[id]` (both exist) | `DoctorSearchView.tsx:53-68`, `care.service.ts:260-300` |
| Loading text, empty state | text | static copy | none | `DoctorSearchView.tsx:164-173,185-195` |

### 15c. `?view=pharmacy`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| (nothing drawn) | | | `<Redirect href="/search" />`, dropping `q` and `view` | `src/components/views/PharmacyProductSearchView.tsx:3-5` (NR-27) |

Entered from `app/pharmacy/product-search.tsx` and `app/ai/prescription-translator.tsx:255` (passes `q`).

## 16. Notifications `app/notifications/index.tsx`

| Element | Kind | Source | Goes to | file:line |
|---|---|---|---|---|
| Header "الإشعارات", back | text, button | static copy | `router.back()`, else `router.replace('/')` (`/` is claimed by three files: NR-8) | `notifications/index.tsx:158-170` |
| "قراءة الكل" | button | static copy; shown only when `unread > 0` (derived from the list) | optimistic update, then `POST /notifications/read-all` (controller `notifications.controller.ts:45-49`, server `markAllRead` `notifications.service.ts:429-435`, no body); on failure it reloads | `notifications/index.tsx:136-143,172-176` |
| Filter chips (الكل, تحديثات, طبي, عروض) | button | derived: a group appears when a notification maps to it; the row is hidden with fewer than 2 groups | `setFilter` | `notifications/index.tsx:128-133,179-186`, `notificationsFeed.ts:52-56` |
| Load call | | on mount, and pull-to-refresh | `GET /notifications` (controller `notifications.controller.ts:13-16`, JWT-only; server `listForUser`: up to 200 rows for the user, the user's role and role `all`, newest first, `notifications.service.ts:401-417`); no pagination | `notifications/index.tsx:110-126` |
| Feed list ("اليوم", "سابقًا" titles + rows) | list | derived by `buildFeed` (a row is "today" when `createdAt` is the same local day); static titles | | `notificationsFeed.ts:76-102`, `notifications/index.tsx:227-235` |
| Row icon + tone | icon | derived from API `type` (`TYPE_META`: appointment, prescription, medication, emergency, labs, promo, order, alert, info; unknown = info) | | `notificationsFeed.ts:39-49,59-70` |
| Row title | text | API `title` (server resolves `title_key` in `lang`, always `ar` because the JWT has no `lang`) | | `notifications/index.tsx:71`, `notifications.service.ts:407-413` (NR-33) |
| Row body | text | API `body`; hidden when empty | | `notifications/index.tsx:72` |
| Row time | text | derived from API `createdAt`: الآن / منذ n دقيقة / n ساعة / أمس / منذ n يوم / the date (`dateLocale()`, Arabic regardless of language); hidden without `createdAt` | | `notificationsFeed.ts:108-119`, `notifications/index.tsx:37,73` |
| Unread dot + bold title + tinted row | icon | API `read` (true when the user id is in `read_by`) | | `notifications/index.tsx:65,71,75` |
| Row tap | button | | marks read locally and `POST /notifications/:id/read` (controller `notifications.controller.ts:39-43`; no redux update, NR-3); then `router.push(translateBackendRoute(action.route))` if it can be translated, else nothing | `notifications/index.tsx:145-156`, `src/hooks/usePushNotifications.ts:33-77` (NR-31) |
| Translated targets | navigation | `/orders/:id[/tracking]` → `/pharmacy/order-tracking?orderId`; `/tracking/pharmacy|lab|radiology|nursing|consultation/:id`; `/nursing/tracking/:id`; `/labs/booking(s)/…`; `/radiology/booking/view/:id`; `/health/results|reports/:id` → `/reports/view-report?reportId` (the screen reads `id`: NR-32); verbatim `/consultations/appointments`, `/diagnostics/results-history`, `/insurance/hub`, `/returns/hub`, `/loyalty/hub|referrals|challenges`, `/health/family-hub`, `/ai/symptom-timeline`, `/emergency/tracking`. Files exist for each target (seen) | | `usePushNotifications.ts:33-77` |
| Skeleton (4 rows) | image | derived (`loading`) | none | `notifications/index.tsx:83-100` |
| Empty state "لا توجد إشعارات بعد" | text | derived (0 rows, no failure) | none | `notifications/index.tsx:209` |
| Error / offline state + "إعادة المحاولة" | text, button | derived (`failed` with an empty list) | `load()` | `notifications/index.tsx:201-208` |
| Pull-to-refresh | derived | `refreshing` | `load(true)` | `notifications/index.tsx:190-199` |

Backend `type` values the server really writes: `info`, `order`, `appointment`, `prescription`, `emergency`, `medication`, `promo`, `alert` (`backend/src/common/enums.ts:172-181`); appointment created/confirmed/completed and report-ready notifications are written as `info` (`notifications.service.ts:694,704,716,667`), so they draw the "info" icon and sit in the "تحديثات" group; `labs` never occurs (NR-34). With no session the call answers 401 and the screen shows the "could not load" state (NR-30). A date older than 30 days is formatted with `dateLocale()` (Arabic) whatever the app language (NR-35).
