# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE17_NATIVE_BUILD_AND_DEVICE_BLOCKERS_20260819.md`
- **Member SHA-256:** `26213603e7b79a220dcfe442f4c624daa1986b2e2793b6de75956a35d90f40a1`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: | device farm وهاتفان حقيقيان | لا logs/screenshots/videos أو ربط أجهزة | لا logs/screenshots/videos أو ربط أجهزة | BLOCKED |`
- `23: > أصبح للمشروعين `eas.json` بصيغة profiles متوازية وproduction فارغ. هذه تهيئة صالحة مبدئياً، لكنها ليست build receipt ولا تثبت وجود Apple signing أو Android keystore أو حسابات EAS مخولة. لم ينفذ هذا التغيير أي build أو submit أو نشر.`
- `32: | Android device farm | QA/Release | matrix Android صغيرة/متوسطة/tablet، Android versions، screenshots/logs/crashes |`
- `34: | Native services | Product/Infra/Owner | LiveKit/CallKeep أو full-screen intent، Firebase/notifications، associated domains، privacy prompts وcrash reporting evidence |`
- `38: لا ينتقل الحكم إلى PASS إلا عند وجود artifacts موقعة لكل تطبيق وlogs/crashes/screenshots أو فيديو من device farm وهاتف Android وهاتف iOS، مع قائمة عيوب صريحة وإعادة تحقق للحالات الحرجة. غياب حسابات Apple/EAS أو الأجهزة ليس عيباً يمكن حله بإ`
### backend_consumers_or_contracts
- `21: تتضمن إعدادات Provider صلاحيات الكاميرا والميكروفون والموقع والإشعارات والتحقق الحيوي، وتستخدم `https://api.nabd.plus/api/v1`. تتضمن إعدادات Patient deep links وassociated domains وFirebase config references ومجموعة أوسع من الصلاحيات، بما ف`
- `34: | Native services | Product/Infra/Owner | LiveKit/CallKeep أو full-screen intent، Firebase/notifications، associated domains، privacy prompts وcrash reporting evidence |`
### auth_ownership
- `21: تتضمن إعدادات Provider صلاحيات الكاميرا والميكروفون والموقع والإشعارات والتحقق الحيوي، وتستخدم `https://api.nabd.plus/api/v1`. تتضمن إعدادات Patient deep links وassociated domains وFirebase config references ومجموعة أوسع من الصلاحيات، بما ف`
- `29: | ربط EAS/Expo للمشروعين وتوفير project ownership | Owner/Release manager | build IDs قابلة للتحقق، profiles production وartifact URLs/SHAs |`
- `30: | Android signing | Owner/Release manager | AAB/APK production signed، keystore محفوظ لدى المالك، Play integrity/installation log دون كشف secret |`
- `31: | Apple signing/TestFlight | Apple Developer owner | certificate/provisioning managed، IPA/TestFlight build number وسجل نجاح الرفع |`
- `33: | هاتفان فعليان | QA/Owner | Android وiOS: push/deep link/weak network/lifecycle/orientation/permissions/camera/GPS/audio/background test evidence |`
- `34: | Native services | Product/Infra/Owner | LiveKit/CallKeep أو full-screen intent، Firebase/notifications، associated domains، privacy prompts وcrash reporting evidence |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
