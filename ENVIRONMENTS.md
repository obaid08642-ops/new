# البيئات الثلاث — دليل التشغيل الموحد (M0-08)

## نظرة عامة

| البيئة | الغرض | قاعدة البيانات | الدومين المقترح |
|---|---|---|---|
| `development` | تطوير محلي على جهازك | Mongo/Redis محليان (Docker) | `localhost:8002` |
| `staging` | اختبار قبل الإطلاق — نسخة مطابقة للإنتاج | Mongo/Redis مخصصان للاختبار | `api-staging.nabdahplus.com` |
| `production` | المستخدمون الحقيقيون | Mongo/Redis للإنتاج (نسخ احتياطي مجدول) | `api.nabdahplus.com` |

## تشغيل الباك إند محليًا (development)

```bash
cd nabdah-backend
cp .env.example .env          # ثم عدّل القيم: JWT_SECRET عشوائي 64 حرفًا على الأقل
docker compose -f infra/docker-compose.infra.yml up -d   # Mongo + Redis + LiveKit
npm install
npm run start:dev             # http://localhost:8002 — وثائق API على /api/docs
```

زرع حساب أدمن (مرة واحدة فقط — M0-01):
```bash
ADMIN_PHONE=+9665XXXXXXXX ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD='StrongPass!234' \
MONGO_URL=mongodb://localhost:27017/nabd npx ts-node src/scripts/seed-admin.ts
```

## تشغيل لوحة الأدمن

```bash
cd Napd-admin/web-admin
echo "NEXT_PUBLIC_API_URL=http://localhost:8002" > .env.local
npm install
npm run dev                   # http://localhost:3000 → صفحة /login
```

## تشغيل تطبيق المريض أو المزود على جوالك (Expo Go)

```bash
cd nabd_plus                 # أو NabdProvider
npm install
npx expo start               # امسح QR بتطبيق Expo Go على جوالك
```
> لتوجيه التطبيق لباك إند جهازك: تطبيق المزود يدعم IP مخصص من شاشة الإعدادات، وتطبيق المريض سيُنقل عنوانه إلى متغير بيئة في المرحلة M1.

## قواعد صارمة بعد إصلاحات M0

1. **ممنوع** رفع أي ملف `.env` إلى Git (محمي الآن بـ `.gitignore` + فحص gitleaks في CI).
2. **ممنوع** تفعيل `USE_MEMORY_MONGO` في الإنتاج — الخادم سيرفض الإقلاع.
3. **ممنوع** الإقلاع في الإنتاج بدون `JWT_SECRET` بطول 32+ حرفًا — الخادم سيرفض الإقلاع.
4. لا حسابات افتراضية — الأدمن يُزرع يدويًا بالسكربت أعلاه فقط.
