# Web Production Container Preparation

## الحالة

**جاهز للمراجعة والنشر كـDocker image؛ لم يتم نشر أي شيء.**

أُضيف Dockerfile multi-stage يستخدم `node:22-alpine`، تثبيتاً reproducible عبر `pnpm-lock.yaml`، وبناء Next production في مرحلة builder، ثم تشغيل `.next/standalone/server.js` في runner مستقل كمستخدم غير root `nextjs` على port 3000. تم تفعيل `output: "standalone"` في `next.config.ts`.

أُضيف `.dockerignore` لمنع `.env` و`.env.*` و`.next` و`node_modules` و`.git` وملفات logs/coverage من build context. لا يحتوي image على production env values؛ يتم حقنها من deployment platform وقت التشغيل.

أُضيف `.env.production.example` بالمتغيرات المستخدمة فعلياً فقط:

| Variable | Role | Secret? |
|---|---|---|
| `NABD_API_BASE_URL` | server-side BFF upstream | لا، لكن server-only |
| `NEXT_PUBLIC_SITE_ORIGIN` | public canonical origin | لا |
| `RUN_SANDBOX_TESTS` | optional local gate switch | لا |
| `RUN_SANDBOX_CREDENTIAL_TEST` | optional local gate switch | لا |
| `NABD_SANDBOX_*` | placeholders only, commented | نعم عند التفعيل؛ لا توضع في Git |

لا توجد أسرار أو passwords أو tokens في المثال. يجب إنشاء `.env.production` على منصة النشر من secret manager، وليس من Git.

## Gates

| Gate | Result |
|---|---|
| `pnpm test` | **127 files passed، 14 skipped؛ 242 tests passed، 23 skipped** |
| `pnpm check` | passed |
| `pnpm build` | passed |
| `.next/standalone/server.js` | موجود |
| Docker static checks | passed |
| Docker image build | لم يُنفذ؛ Docker daemon غير متاح في sandbox الحالية |

## Deployment notes

يجب تزويد container runtime بـ`NABD_API_BASE_URL=https://api.nabd.plus/api/v1` و`NEXT_PUBLIC_SITE_ORIGIN=https://nabd.plus`، ثم تمرير `PORT=3000` وhealth/readiness probe مناسب للتطبيق. لا يتم وضع `NABD_API_BASE_URL` في `NEXT_PUBLIC_*` ولا تسجيل قيم env في logs.

يجب تنفيذ `docker build` و`docker run` في CI أو منصة النشر الفعلية، ثم smoke test للصفحات العامة وBFF بدون تسجيل session token في HTML أو URL. هذه الخطوة لم تُنفذ في sandbox لغياب Docker daemon، لذلك الحكم هو **container-prepared, deployment-not-yet-verified**.

## Related blocked item

`Radiology detail` ثابت كـ`blocked-on-backend`، ولا يغير Docker preparation هذا الحكم.
