# Verifier Index — مشروع نبض (الفحص الشامل)

## v1 — 2026-08-02
**ما يقيسه:** الجرد الشامل + فحص الصحة الأساسي للمشروع:
- عدد الشاشات الفعلي لكل مكوّن مقابل المُعلن (مريض 239 / مزود 114 / أدمن 23 / باك إند 1122 route / 97 module)
- صفر TODO/Placeholder/Mock/Dummy في كود الإنتاج
- كل استدعاء API في الواجهات له route مطابق في الباك إند
- فحص secrets/tokens المسرّبة داخل الكود
- صحة التشغيل الحي: health endpoint على api.nabd.plus

**كيف يعمل:** سكربت `verifier/v1/verify.sh` يُنتج تقرير `verifier/runs/<timestamp>.log` بنتائج PASS/FAIL.
**الفرق عن السابق:** أول نسخة.
