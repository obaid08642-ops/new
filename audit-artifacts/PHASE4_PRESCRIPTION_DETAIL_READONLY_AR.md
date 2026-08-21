# Phase 4 — Prescription Detail Read-only

تمت إضافة `/[locale]/prescriptions/[prescriptionId]` من نفس `GET /prescriptions/mine` المملوك للمريض. تمت إضافة allowlist لتفاصيل medication المؤكدة: name/dose/frequency_hours/duration_days/instructions.

تم إسقاط diagnosis وnotes وupload_image وpatient IDs، ولا توجد أزرار upload أو renew أو dispense أو order/payment. البحث عن prescriptionId يتم داخل القائمة التي أعادها نفس patient-owned GET، مع UUID validation و404 عند عدم وجود العنصر.

التحقق: full Vitest نجح بـ73 test files passed و14 skipped، 132 tests passed و23 skipped، truthful-runtime gate على 220 production files، TypeScript، production build، وdiff check.
