# REVIEW — Phase 10 + Phase 11

المراجعةultimateمطلوبة قبل الدفع. الفرع: `fix/audit-2026-09`.

> **تنبيه: الحالة المدفوعة على GitHub لا تُصرَّف (type-check).**
> `origin/fix/audit-2026-09` = `f2dd8f9`، وفيه `backend/src/common/step-up.spec.ts` يبني
> `new StepUpService()` بلا وسائط بينما الـ constructor صار يطلب واحدًا ⇒ `TS2554` ×2.
> الإصلاح جاهز ومتحقَّق منه لكنه **غير مدفوع** — يُدفع مع هذا الملف.

---

## 1) الكوميتات

### غير مدفوعة (يجب رفعها — الإصلاح عملي)

| SHA | المحتوى |
|---|---|
| `81457b1` | إصلاح `step-up.spec.ts` ⇒ **الفرع يُصرَّف من جديد**، step-up 9/9 |
| `73838fd` | سجل Phase 10/11 + التحقق النهائي |

### مدفوعة بالفعل

`759e8f7` fallback استرجاع النسخة · `9080ad5` PDPL erasure (إثبات ملكية + `bcryptjs`) ·
`432123b` validation قرار المراجعة + إصلاح spec الـ OTP + حذف dependency ميتة ·
`648e423` رفض الموافقة كان يُخزَّن كقبول + تصحيح ادّعاء AI · `bb59a1a` البوابة خضراء + زرع admin ·
`20da879` تصحيح سجل LiveKit + دليل Phase 8/9 · `5c30c57` F52 ربط LiveKit ·
`4969f7c` سجل التحقق النهائي · `b2b8ffa`/`72b5bdd` تصفير ثغرات high/critical ·
`ea33d98` إزالة سر TURN · `e002474` قائمة مراجعة محتوى AI · `1b52d3f` F82 LCP (جزئي) ·
`ed1ce17` PDPL معرّفات erasure · `2be827c` سجل · `c693684` PDPL الويب ·
`b7d2fc8` restore drill + تنبيه القرص · `b53e886` F68 CSP · `195153b`/`d141cab` F60b + سجل.

**ليست عملي** (للجلسة الأخرى): `671e079` `ef4c17c` `4bad33b` `384a20f` (P12)، `f2dd8f9` (7C).

---

## 2) العيوب التي وُجدت وأُصلحت — كلٌّ مُثبت باختبار يفشل بدون الإصلاح

| # | العيب | الأثر | كوميت |
|---|---|---|---|
| 1 | `require('bcrypt')` — `bcrypt` غير مثبَّت ولا معلَن (المشروع كله `bcryptjs`) | **أول مريض يدخل كلمة مرور عند حذف حسابه يحصل على 500** بدل التحقق. الاختبار القديم مرّ لأنه يمرّر كلمة مرور فارغة فيتخطّى الفرع | `9080ad5` |
| 2 | `if (user.password_hash && opts?.password)` لإثبات الملكية | يُتخطّى إن كان أي طرف فارغ؛ **التسجيل الاجتماعي يخلق `password_hash: ''`** ⇒ حساب مريض social يُدمَّر كاملًا بستم فقط، على endpoint تعليقُه يقول إن كلمة المرور لمنع ذلك | `9080ad5` |
| 3 | `legal_consents.accepted` غير معلَن في `@Prop` | Mongoose casting من الـ decorator لا من نوع TS ⇒ **رفض الموافقة كان يُخزَّن كقبول**، فلا دليل PDPL على الرفض | `648e423` |
| 4 | `@Body() { decision?: string; note?: string }` | ValidationPipe يتخطاها ⇒ أي قيمة تُحوَّل صامتًا إلى "rejected" على عنصر مراجعة طبية. الآن DTO حقيقي | `432123b` |
| 5 | spec الـ OTP يمرّر الـ mailer في الخانة 9 (وهي `adminSession`؛ `mail` هي 11) | `this.mail=undefined`، والخطأ يُبتلع في `catch` داخل `deliverOtp` ⇒ يظهر `otp_channel_unavailable` كاذبًا | `432123b` |
| 6 | `mongo` (4.x/5.x) لا يقبل `--uri` | fallback استرجاع النسخة معطوب على **exactly** Kornوعود الموجه له | `759e8f7` |
| 7 | `phosphor-react-native` غير مستخدم | خطئي: `72b5bdd` stage الملف كاملًا فسحبها. حُذفت من `package.json` والـ lock | `432123b` |
| 8 | `step-up.spec.ts` قديم مقابل `f2dd8f9` | **الفرع لا يُصرَّف**؛ اختبارات الـ guard كانت تدّعي العقد القديم و`canActivate` صار async | `81457b1` |

**#1 هو الأخطر**: كود يبدو صحيحًا تمامًا، والاختبار أخضر، وقاعدة البيانات صامتة. وُجد لأننا سألنا
"وماذا لو مرّر المستخدم كلمة مرور؟" — لا لأن أي بوابة فشلت.

---

## 3) التحقق النهائي (بعد كل الإصلاحات)

- backend `npm test`: **3009/3009** · 189 suite · **9/9 chunks** · **0 فشل** (كان 2978/2979)
- `npx tsc --noEmit`: **نظيف**
- patient-app **136/136** (45 suite) · PDPL e2e **13/13** · AI review **11/11** · AI **22/22**
- payments-idor **12/12** · patient-web-auth **7/7**
- **البوابة على DB نظيف، تشغيل واحد، بدون إعادة تشغيل واحدة: 1146/1146، 0 فشل**
  - `gate P1`: 368 مسار write بـ patient token ⇒ **0 ردّ 2xx**
  - accounts 42 · onboarding 113 · pharmacy 144 · lab 133 · radiology 105 · nursing 93
  - consultation 110 · ambulance 67 · facility 186 · support 32 · loyalty 104 · admin_clicks 17

**كل redness السابق كان بيئيًا لا برمجيًا** — أثبتُّ ذلك بدل افتراضه:
- لا زرع لـ `admin@nabd.test` ⇒ ~29 فشلًا مضلّلًا (`401`/`csrf_validation_failed`) ⇒ `run_gate.sh` صار يزرعه.
- يتيم 1.2GB (`tools/audit/clientbodies.js`) + بوابات متزامنة ⇒ macOS SIGKILL للـ backend ⇒ ~29 `502`.
  البوابة الآن تفحص `health/liveness` قبل كل journey، وتعيد التشغيل **بصوت عالٍ** (`!!` + عدد في النهاية).
- `admin/.next` تالف ⇒ SSR بلا hydration ⇒ زر الإرسال بلا أثر ⇒ `j_admin_clicks` كشفه. هذا بالضبط سبب وجوده.

---

## 4) ما زال مفتوحًا — بصراحة

| البند | الحالة / السبب |
|---|---|
| **F82 LCP** | `/ar/c` 4.3s، `/ar` 4.5s مقابل ≤3s. اختناق `scriptEvaluation` عبر 104 client components. **تعمّدت عدم لمسه**: LCP لا يُقاس بصدق على جهاز 8GB (الذاكرة تنخفض لـ 3.6k pages أثناء التشغيل)، وrefactor كبير بلا قياس موثوق أسوأ من تركه |
| **دفع sandbox** | العقد مُثبت محليًا (fake Moyasar) — يلزم مفاتيح Moyasar/Tap حقيقية لإثبات success/fail/refund |
| **LiveKit** | JWT + bundle مُثبَّتان باختبارات (5/5) — يلزم جهازان + EAS dev build لمكالمة حقيقية |
| **gitleaks تاريخ** | 191 (184 test fixtures + 7 نسخ سر TURN القديم). السر خارج HEAD؛ يلزم تدوير على السيرفر + إعادة كتابة تاريخ (force-push — لا أفعله) |
| **staging** | `https://staging.nabd.plus/api/v1` على build قديم (PDPL 404) — يلزم deploy من هذا الفرع |
| **`mongo` القديم** | مُصلَح **بالقراءة لا بالتشغيل** (لا يوجد `mongo` على هذه الآلة) — يحتاج تجربة على host 4.x/5.x |

---

## 5) قرارات تتطلّب صاحبها — لا تُنفَّذ صامتة

1. **حسابات social لم تعد تستطيع حذف نفسها** (fail-closed عند غياب `password_hash`). مقصود وآمن — stolen token لم يعد يمحو سجلًا طبيًا — لكنه **ثغرة وظيفية** تحتاج قناة موثّقة (OTP أو ضبط كلمة مرور). لم أختلق آلية من عندي.
2. **السجلات القديمة** بلا `accepted` تبقى `undefined` — لم أضع `false` حتى لا ندّعي قرارًا لم يُسجَّل.
3. **مسار bootstrap في step-up** (لا يوجد factor ⇒ يُسمح) سلوك مقصود وموثّق؛ أضفتُ له اختبارًا لأنه لم يكن مغطّى.
4. **مسارات AI التي تُخرج نص موديل** (`analyzeMeal`, `generateDietPlan`, `generateExercisePlan`) **غير مبوّبة** في قائمة المراجعة. البوابة على triage/skin فقط، وهما لا يُخرجان نص موديل أصلًا. البوابة على الثلاثة قرار منتج عن تجربة المريض، لم آخذه منفردًا.

---

## 6) تنبيهات للمراجعة

- `dtolint` ما زال يعلّم على `loyalty.controller.ts`، `insurance.module.ts`، `admin-recovery.controller.ts`، `step-up.controller.ts` — كلها من نطاق 7C/working tree. نظيف الآن في `ai-content-review`.
- `run_gate.sh` (لي) يستدعي `start-backend.sh` و`start-web.sh` — راجعهما معًا.
- الشجرة الحالية فيها عمل غير مُسلَّم من الجلسة الأخرى (تصميم/CI). **`git add -A` سيبتلع عملي** — استخدم pathspec.
- **راجع النتائج لا الكوميتات**: أي F-id في الخطة بقي مفتوحًا فهو开放式، وأي ادّعاء في `AGENT_PROGRESS.md` غير مسنود بمخرجات فيُصحَّح قبل الاعتماد.

---

## 7)How to verify / how to push

```bash
cd /Users/ahmedobaid/nabd-plus

# 1. the two unpushed commits
git log --oneline origin/fix/audit-2026-09..HEAD        # expect 81457b1, 73838fd

# 2. branch compiles
cd backend && npx tsc --noEmit -p tsconfig.json && echo "tsc clean"

# 3. full backend suite
npm test                                               # expect 3009/3009, 9/9 chunks

# 4. live gate (needs: Mongo rs0 :27017, Redis :6379, smtp :2525, fake_moyasar :9100)
cd ..
bash tools/live/start-backend.sh &
bash tools/live/start-web.sh admin
bash tools/live/run_gate.sh                            # expect 1146/1146

# 5. per-commit review against the plan
git diff origin/fix/audit-2026-09~22..HEAD -- <path>
# plan contract: docs/audit/02_AGENT_EXECUTION_PLAN.md
```

**ترتيب الدفع:** راجع (2) و(3) و(4) أولًا — هم دليل أن الفرع سليم. ثم ادفع الكوميتَين
غير المدفوعين. **لا تدفع قبل (2)**: القاعدة المدفوعة حاليًا لا تُصرَّف.
