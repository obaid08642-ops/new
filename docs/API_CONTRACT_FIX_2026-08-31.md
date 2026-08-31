# Phase A2 — حسم الـ 23 استدعاء اليتيم (2026-08-31)
منهجية: مطابقة دلالية بالرموز + تحقق من توقيعات الباكند الفعلية قبل أي تغيير.

## ✅ أُصلح الآن (إعادة تسمية آمنة مؤكدة — 1)
- `/push/register` → `/notifications/register-token` (في `src/utils/notifications.ts`) — الباكند يعرض `@Post('register-token')` فعلاً.

## ❌ أُلغي ترشيح إعادة تسميتها — ثبت أنها فجوات حقيقية وليست أسماء خاطئة (لا نربط شاشة بـ endpoint مكسور)
- `/wearables/data` + `/wearables/devices`: الباكند لديه فقط `wearables/link` + `unlink` وكلاهما `throw NotImplementedException` — نقطة نهاية نصف مبنية. القرار: بناء باكند.
- `/patient/pharmacy/orders`: الموجود في `pharmacy_ops` هو جانب المزود (submit-basket/reject) — استدعاء المريض فجوة حرجة حقيقية. القرار: بناء باكند (أولوية قصوى).

## 🔴 فجوات حقيقية تتطلب بناء باكند (القائمة النهائية للبناء — 22)
| الأولوية | المجال | الـ endpoints المطلوب بناؤها |
|---|---|---|
| P0 حرج | pharmacy (مريض) | POST/GET `/patient/pharmacy/orders` (+ my, :id) |
| P0 عالي | insurance (مطالبات مريض) | claims, claims/my, claims/submit, benefits-summary, ocr-extract, requests/my, save-policy (7) |
| P1 عالي | home-care/nursing (مريض) | `/home-care/services`, `/packages`, `/bookings`, `/bookings/my` — أو توحيد الموبايل على `/nursing/*` الموجودة (قرار معماري: الأنسب بناء alias مريضة نظيفة) |
| P2 متوسط | reviews | `/patient-ux/review` |
| P2 متوسط | articles | `bookmarks/mine`, `categories` |
| P2 متوسط | chat/family | `/chat/threads/direct`, `/family/chat/messages` |
| P2 متوسط | wearables | `/wearables/data`, `/wearables/devices` (وإكمال link/unlink) |
| P3 منخفض | ai + misc | `/ai/drug-interactions`, `/refunds/my` |

## القرار المعماري المقترح
بدل 22 alias مبعثر، الأنظف: إضافة وحدات باكند مريضية (`patient-orders`, `patient-claims`, `patient-homecare`, `patient-reviews`) تفرّع من الخدمات الموجودة وتعرض العقود التي ينتظرها الموبايل/الويب — فيصبح الموبايل والويب على نفس العقد الحقيقي (مبدأ "من سجل من الموبايل يرى نفسه على الويب").
