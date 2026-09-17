# حزمة النشر الإنتاجي — Nabdah Plus (nabd.plus)

بنية كاملة جاهزة للتشغيل على Ubuntu 24.04 (OVH). كل شيء مؤتمت — لا أوامر يدوية إلا الحد الأدنى.

## البنية

```
deploy/
├── docker-compose.production.yml   # 9 خدمات: backend fastapi admin-web mongodb redis livekit coturn nginx certbot
├── setup-server.sh                 # إعداد السيرفر بلمسة واحدة (Docker/UFW/fail2ban/SSH/sysctl/swap/logrotate/AWS CLI)
├── .env.production.example         # كل المتغيرات (الأسرار تُولَّد تلقائياً أول مرة)
├── DNS-RECORDS.md                  # سجلات DNS الستة الموثقة
├── docker/
│   ├── Dockerfile.backend          # NestJS multi-stage (port 8002 + healthcheck)
│   ├── Dockerfile.fastapi          # FastAPI (uvicorn ×2, port 8001)
│   ├── Dockerfile.admin-web        # Next.js build+start (port 3000)
│   └── provider-landing/           # صفحة هبوط provider.nabd.plus
├── nginx/
│   ├── nginx.conf                  # gzip + rate limiting + ws map + proxy cache
│   └── conf.d/nabd.plus.conf       # api/admin/provider/live vhosts + SSL + Socket.IO
├── coturn/turnserver.conf          # realm=nabd.plus + shared-secret (يطابق COTURN_SECRET)
├── livekit/livekit.yaml            # SFU + TURN integration + keys
├── redis/redis.conf                # AOF persistence + 512MB LRU
├── mongo/mongod.conf               # auth + WiredTiger 1.5GB + slow-op profiling
├── mongo/init-indexes.js           # 40+ فهرس إنتاجي لكل المجموعات الساخنة
├── fail2ban/jail.local             # sshd + recidive
└── scripts/
    ├── deploy.sh                   # النشر الرئيسي (7 خطوات) — أعد تشغيله بعد أي تعديل env
    ├── issue-certs.sh              # شهادات Let's Encrypt للنطاقات الخمسة
    ├── backup.sh                   # mongodump يومي → محلي 14 يوم + R2
    ├── health-check.sh             # بطارية فحص شاملة (~20 فحصاً)
    └── logrotate.conf              # تدوير السجلات
```

## خطوات التشغيل على السيرفر

```bash
# 1) انسخ المشروع إلى /opt/nabdah (يُنفَّذ آلياً عبر deploy-remote.sh من جهازنا)
# 2) إعداد السيرفر
bash /opt/nabdah/deploy/setup-server.sh
# 3) النشر الكامل
cd /opt/nabdah/deploy && bash scripts/deploy.sh
# 4) بعد توجيه DNS
bash scripts/issue-certs.sh && bash scripts/health-check.sh
```

## ما يحدث تلقائياً
- توليد كل الأسرار (Mongo/Redis/JWT/Coturn/LiveKit/VAPID) وتخزينها في `.env.production` (600).
- حقن IP العام في coturn/livekit.
- بناء الصور، إقلاع الخدمات التسع، تطبيق الفهارس، إصدار الشهادات، فحص الصحة.
- cron يومي للنسخ الاحتياطي إلى R2 + cron للنسخ الاحتياطي المحلي + تجديد الشهادات كل 12 ساعة.

## ما يُملأ يدوياً في `.env.production` (مفاتيح الطرف الثالث فقط)
Firebase FCM · Resend · SES SMTP · R2 (S3_*) · Gemini/AI · بوابات الدفع · APNs (لاحقاً).

بعد أي تعديل: `docker compose --env-file .env.production -f docker-compose.production.yml up -d --build backend`
