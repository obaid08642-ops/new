# Phase 1 — Baseline التنفيذ ومصادر العقود

## ما تم إثباته

- الفرع: `agent/web-complete-v2-20260822`.
- الرأس المحلي والبعيد عند بدء التنفيذ: `548a4a139e32ce1fa32c7ab9a6e5516c42f5484e`.
- `https://nabd.plus` و`https://www.nabd.plus` يعيدان HTTP 200 ويصلان إلى `/ar`.
- probes الحية غير المصادق عليها: unified booking وreschedule وcall-token وHome-care mine محمية، وفق status موثق في `phase1-baseline.log`.

## ملاحظات يجب عدم تجاهلها

1. لم يجد checkout الحالي ملف `audit-artifacts/PATIENT_WEB_CONTRACT_PACK_V1.md` أو `audit-artifacts/nabd-patient-api-openapi.json` في المسارات المتوقعة. توجد artifacts تاريخية عديدة، لكن لا يجوز افتراض أنها المرجع الحي قبل تحديد النسخة المعتمدة أو إعادة تنزيلها من المصدر الموثوق.
2. `GET /radiology/services/00000000-0000-4000-8000-000000000000` أعاد 404؛ هذا يثبت أن المورد الصفري غير موجود فقط، ولا يثبت فشل endpoint. يجب استخدام معرف حقيقي من القائمة العامة عند اختبار detail.
3. توجد قيم مثل `private` و`Verified Doctor` وUUIDs صناعية داخل test files. هذه fixtures اختبارية وليست دليلاً على mock في runtime، لكن يجب إبقاؤها خارج الإنتاج وفحص bundle النهائي بحثاً عن تسربها.
4. سجل pnpm أظهر تحذيراً بأن حقل `pnpm` داخل `package.json` لم يعد مقروءاً في pnpm 10؛ يلزم نقل overrides/patches إلى `pnpm-workspace.yaml` أو الإعداد المدعوم قبل اعتبار lockfile/reproducibility مغلقين.

## قرار Phase 1

الـbaseline التشغيلي ناجح جزئياً، لكنه لا يُغلق بعد إلى أن تُثبت نسخة contract source الحية، ويُعاد probe Radiology بمعرف حقيقي، وتُحسم إعدادات pnpm. لا يبدأ أي slice جديد يعتمد على عقد غير موثق في checkout أو production probe.
