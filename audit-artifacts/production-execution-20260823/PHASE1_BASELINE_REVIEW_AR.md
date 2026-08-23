# Phase 1 — Baseline التنفيذ ومصادر العقود

## ما تم إثباته

- الفرع: `agent/web-complete-v2-20260822`.
- الرأس المحلي والبعيد عند بدء التنفيذ: `548a4a139e32ce1fa32c7ab9a6e5516c42f5484e`.
- بعد توثيق baseline، أصبح commit الأدلة المحلي والبعيد: `dfa33d62294ab81bc03d9ca45cbd146b3febfd65`.
- `https://nabd.plus` و`https://www.nabd.plus` يعيدان HTTP 200 ويصلان إلى `/ar`.
- probes الحية غير المصادق عليها: unified booking وreschedule وcall-token وHome-care mine محمية، وفق status موثق في `phase1-baseline.log`.

## ملاحظات يجب عدم تجاهلها

1. لم يجد checkout الحالي ملف `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md` أو `audit-artifacts/nabd-patient-api-openapi.json` في المسارات المتوقعة. توجد artifacts تاريخية عديدة، لكن لا يجوز افتراض أنها المرجع الحي قبل تحديد النسخة المعتمدة أو إعادة تنزيلها من المصدر الموثوق.
2. `GET /radiology/services/00000000-0000-4000-8000-000000000000` أعاد 404؛ هذا يثبت أن المورد الصفري غير موجود فقط، ولا يثبت فشل endpoint. يجب استخدام معرف حقيقي من القائمة العامة عند اختبار detail.
3. توجد قيم مثل `private` و`Verified Doctor` وUUIDs صناعية داخل test files. هذه fixtures اختبارية وليست دليلاً على mock في runtime، لكن يجب إبقاؤها خارج الإنتاج وفحص bundle النهائي بحثاً عن تسربها.
4. سجل pnpm أظهر تحذيراً بأن حقل `pnpm` داخل `package.json` لم يعد مقروءاً في pnpm 10. محاولة نقل الإعداد إلى `pnpm-workspace.yaml` أزالت patch من lockfile، لذلك تم التراجع عنها لحماية reproducibility. الإصلاح الصحيح يحتاج تثبيت صيغة pnpm 10 المعتمدة والتحقق من بقاء patch hash قبل اعتماده.

## بوابات التنفيذ

- `pnpm check`: ناجح.
- `pnpm test`: **133 test files passed، 14 skipped؛ 257 tests passed، 23 skipped**.
- `pnpm build`: ناجح، وتم توليد مسارات التطبيق وواجهات API دون خطأ TypeScript أو compilation.
- Docker build: **لم يُنفذ** لأن أداة Docker أو `Dockerfile` غير متاحة في checkout/البيئة الحالية. لا يُحتسب ذلك نجاحاً، ويظل مطلوباً في بيئة CI أو staging.
- لم تُشغّل اختبارات Sandbox في هذه المرحلة، لأن اعتماد الحسابات لا يبرر تشغيل mutation قبل إكمال baseline contract source وإثبات العزل الإجرائي؛ ستُشغّل فقط وفق الحسابات المعتمدة وبروتوكول الإلغاء والتنظيف.

## ملاحظة Phase 2 المبكرة — Registration

تم إثبات وجود `POST /auth/send-otp` و`POST /auth/register` و`POST /auth/verify-otp` على الإنتاج عبر HTTP 400 validation. لكن DTO الكامل وتسلسل نجاح التسجيل لم يُثبت في checkout الحالي، بينما Mobile يمرر كلمة المرور ضمن navigation params. لذلك أُغلقت فقط جسور BFF الآمنة ذات العقود المحددة، ولم تُبنَ واجهة تسجيل كاملة توهم باكتمال رحلة لا تزال تحتاج عقد verify-otp واضحاً أو probe Sandbox معتمد. هذا قرار Contract-First مقصود.

## قرار Phase 1

Phase 1 مغلقة **جزئياً**: baseline التطبيق والاختبارات وbuild موثقة ومدفوعة، لكن Docker ومرجع contract source وإعداد pnpm وprobe Radiology بمعرف حقيقي ما زالت عناصر متابعة إلزامية. يمكن بدء Phase 2 فقط في العقود التي ثبتت حيوياً أو توجد لها wrappers واختبارات قائمة؛ ولا يجوز توسيع allowlist اعتماداً على ملف مفقود.
