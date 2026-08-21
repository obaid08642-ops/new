# Phase 7 — Diagnostics Report Marker

تم توسيع `DiagnosticBooking` بعلامة boolean فقط: `hasReport`، وتُحسب من وجود `reports` أو `signed_report_pdf_url` في response الحقيقي. Web يعرض badge مترجمًا `reportReady` في قائمة Diagnostics، ولا يعرض URL أو body أو attachment أو PDF download.

تم تحديث parser test القديم ليقبل العلامة الجديدة مع استمرار إسقاط patient/pricing/report payload، وإضافة test مستقل. نجحت full Vitest: 64 test files passed و14 skipped، 117 tests passed و23 skipped، truthful gate على 193 production files، TypeScript، production build، وdiff check.

لا توجد report mutation أو upload/delete أو protected media route في هذه slice.
