# Phase 4 — Chat Detail Read-only

تمت إضافة `/[locale]/chat/[threadId]` بعقود GET حقيقية:

- `GET /chat/threads/:threadId`
- `GET /chat/threads/:threadId/messages?limit=50`

المصدر يثبت `assertParticipant` داخل `getThread` و`getMessages`. Web يعرض نوع المحادثة وتوقيت/نوع/حالة نشاط الرسائل فقط، ويسقط body وsender IDs وparticipant IDs وattachment URLs وreactions وread/delivered maps.

تمت إضافة UUID validation وGET-only allowlist ومسار server-side session. كل POST الخاصة بـsend/read/delivered/edit/delete/reactions والـuploads وrealtime بقيت Deferred؛ لذلك لا يوجد زر إرسال أو إجراء يوهم باكتمال chat.

التحقق: full Vitest نجح بـ68 test files passed و14 skipped، 127 tests passed و23 skipped، truthful-runtime gate على 204 production files، TypeScript، production build، وdiff check.
