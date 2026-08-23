
## Orders ownership live probe — 2026-08-23

على `https://nabd.plus` نجح login لحساب owner بحالة 200. الحساب الآخر واجه rate limit مؤقتاً في إحدى المحاولات (`429`) ثم عاد login إلى 200 في محاولة لاحقة. طلب تفاصيل order المخصص بدون جلسة أعاد 200 لأن `requirePatientAccess` ينفذ redirect إلى `/ar/login`، والـHTML كان Auth shell وليس تفاصيل الطلب. سكريبت `verify-sandbox-web-order.sh` الحالي لا يتبع هذا السلوك بشكل صحيح ويجب تحديثه ليختبر auth shell/redirect منفصلاً عن ownership detail. لم يتم إنشاء أو تعديل أو إلغاء أي order، ولم تُطبع credentials أو response bodies.
