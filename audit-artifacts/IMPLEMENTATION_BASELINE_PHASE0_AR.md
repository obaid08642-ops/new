# Implementation Baseline — Phase 0

## الحالة

تم إنشاء فرع تنفيذ مستقل من `main`:

```text
agent/nabdah-web-parity-phase0
```

Commit baseline:

```text
4efd10f189db76631705d2410998b487fb466a13
```

لم يتم تعديل كود Web App أو Mobile Application، ولم يتم إنشاء commit تنفيذ أو push إلى `main`.

## مصادر العمل المثبتة

| المصدر | SHA-256 |
|---|---|
| `NabdProvider-provider.zip` | `73c363440c8f4d68ad1ba3f7e9e78cfdab87167a16be20c66deea46d64214a4c` |
| `nabd_patient_web.zip` | `8593cf8e828645118f14533cdde33386e56687999f84173d4d18cff4b0b1191f` |
| `nabd_plus_patient_app.zip` | `fa37dec94dd2e1525a3fa35e0e6ef68973a0356aa42ca2afca520dee1e5dcfba` |
| `nabdah-backend.zip` | `748d8d80365877460906a992c1834408fcfd117a7be02f7a4ab77307aae62bbc` |
| `web_admin_dashboard.zip` | `6f501ebd543a7c97dc2c2b3125fa563fd7e6e68fd087dc9d20bc4d5234c2a671` |
| `nabd-patient-api-openapi.json` | `dc42da005be00e9a70d397bb880ca880f913068ec187610b03669343fab677ff` |

## Security boundary

لا تُنسخ أي secrets أو tokens أو ملفات `.env` إلى التقرير أو commit. لا يُستخدم `main` للتطوير المباشر. لا يُرفع branch قبل إغلاق اختبارات المرحلة وتوثيق diff.

## قرار Phase 0

الـbaseline والفرع المستقل مثبتان. يمكن الانتقال إلى تدقيق العقود والـsecurity gates، مع بقاء أي تعديل وظيفي محجوزًا حتى تكتمل بوابة المرحلة.
