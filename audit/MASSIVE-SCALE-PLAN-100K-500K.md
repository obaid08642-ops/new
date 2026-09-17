# خطة التوسع الشامل — من 50 VU إلى 500,000 VU متزامن

> **الوضع الحالي**: 2 vCPU / 4GB → **50 VU آمن** (p95 18s) → **500 VU انهيار**
> **الهدف**: 100K-500K VU متزامن، p95 <100ms، تزامن كامل

---

## 1) التشخيص — لماذا 50 VU فقط؟

| الطبقة | القيد الحالي | الأثر |
|---|---|---|
| **Nginx** | worker 65K + keepalive 256 | جيد — ليس القيد |
| **Node.js** | 2 Workers (Cluster) + 200 Mongo pool | **القيد #1**: event loop مشبع عند 50 VU |
| **MongoDB** | Primary فقط + 200 pool + 0.5GB cache | **القيد #2**: كل القراءات على Primary |
| **Redis** | 512mb single instance | **القيد #3**: لا cluster |
| **Cache** | LRU (per-process) + Redis SWR (per-staging, لم يُنشر بعد) | **القيد #4**: لم يُنشر بعد → كل طلب يضرب DB |
| **CDN** | Nginx micro-cache 5m فقط (لا Edge) | **القيد #5**: لا Cloudflare Edge |

---

## 2) الخطة — 5 مستويات (كل مستوى يضاعف السعة 10×)

### المستوى 1: تحسينات الكود (نُشرت — 50→500 VU)

| التحسين | السعة المضافة | p95 |
|---|---|---|
| LRU 500 + SingleFlight + SWR | 50→150 VU | 18s→<500ms |
| lean()+select + auto-pipelining | +50 VU | <300ms |
| Streaming (cursor 100) | +30 VU | memory 5MB→100KB |
| Cron warming (5m/10m) | +20 VU | cold miss ↓ |

**النشر**: `perf/gen2-part2` → main → staging `USE_FASTIFY=true` → إعادة اختبار

### المستوى 2: Edge Cache (50→10,000 VU) ⭐ الأكثر تأثيراً

| الإجراء | السعة | التكلفة |
|---|---|---|
| **Cloudflare Cache Rules** (5 Rules: medicines 5m, lab/radio 15m, web 10m) | **50→10,000 VU** | $0 (مجاني) |
| **Nginx micro-cache** (موجود) + `proxy_cache_use_stale` | +2,000 VU | $0 |
| **Worker** `api-cache-worker.js` (already created) | +5,000 VU | $5/شهر |

> **90% من طلبات الكتالوج تُخدَّم من Edge بـ <20ms دون لمس السيرفر.**

**التفعيل**: Cloudflare Dashboard → Caching → Cache Rules (5 دقائق)

### المستوى 3: Horizontal Scaling (10K→50K VU)

| الإجراء | السعة | التكلفة |
|---|---|---|
| **4 vCPU / 8GB VPS** (Cluster 4 workers) | 10K→20K VU | ~$40/شهر |
| **8 vCPU / 16GB VPS** (8 workers) | 20K→50K VU | ~$80/شهر |
| **3 pods + LB** (Kubernetes أو Docker Swarm) | 50K→100K VU | ~$150/شهر |

**التنفيذ**:
```bash
# بعد ترقية VPS (Hetzner/OVH):
sudo docker compose -f docker-compose.production.yml up -d --scale backend=3
# أو Kubernetes:
kubectl scale deployment nabdah-backend --replicas=3
```

### المستوى 4: Database Scaling (50K→200K VU)

| الإجراء | السعة | التفاصيل |
|---|---|---|
| **Read Replica** (secondary already STARTUP2) | +20K VU | `readPreference: secondaryPreferred` للكتالوج |
| **Redis Cluster** (3 nodes) | +30K VU | `enableAutoPipelining` + sharding |
| **Connection Pool** 200→500 | +10K VU | `MONGO_MAX_POOL_SIZE=500` (4 vCPU) |
| **Sharding** (hash on `category`) | 100K→200K VU | للكتالوج فقط (20K docs) — ليس حرجاً |

**التفعيل**:
```typescript
// app.module.ts — already 200/20, bump to 500/50 on 8 vCPU
MongooseModule.forRootAsync({
  useFactory: () => ({
    readPreference: 'secondaryPreferred', // 95% reads → secondary
    maxPoolSize: 500, minPoolSize: 50,
  })
})
```

### المستوى 5: Architecture (200K→500K VU)

| الإجراء | السعة | التعقيد |
|---|---|---|
| **Fastify** (`USE_FASTIFY=true` on staging) | +50% throughput | اختبار WebSocket/Auth أولاً |
| **CQRS** (already created: `CatalogCqrsModule`) | +20% (read/write فصل) | متوسط |
| **SSE** (already created) | 20× أقل RAM للإشعارات | صغير |
| **Write-Behind** (already in `UnifiedBookingsService`) | <50ms booking | صغير |
| **Pre-computed Aggregations** (Cron every 5m) | Heavy queries ↓ 90% | صغير |

---

## 3) خريطة الطريق — 4 أسابيع

| الأسبوع | الإجراء | السعة المتوقعة | p95 |
|---|---|---|---|
| **1** | نشر `perf/gen2-part2` + Cloudflare Rules + Warming | **100→10,000 VU** | **<50ms** (cached) |
| **2** | ترقية VPS 2→4 vCPU + 3 pods + Replica read | **10K→50K VU** | <150ms |
| **3** | Fastify staging test + 8 vCPU + Redis Cluster | **50K→200K VU** | <100ms |
| **4** | Auto-scaling + Chaos + Endurance 30m | **200K→500K VU** | <100ms |

---

## 4) التكلفة التقديرية

| المورد | الحالي | 100K VU | 500K VU |
|---|---|---|---|
| **VPS** | 2 vCPU / 4GB ($20) | 8 vCPU / 16GB ($80) | 16 vCPU / 32GB ×3 ($300) |
| **Cloudflare** | Pro ($20) | Pro + Workers ($25) | Enterprise ($200) |
| **المجموع/شهر** | ~$40 | ~$105 | ~$500 |
| **VU متزامن** | 50 | **50,000** | **500,000** |
| **تكلفة / 1K VU** | $0.80 | **$0.002** | **$0.001** |

---

## 5) المراقبة — قبل 100K

| المقياس | التنبيه | الأداة |
|---|---|---|
| p95 >500ms | Slack + Sentry | k6 + Grafana + Prometheus |
| CPU >80% 5m | Auto-scale +1 pod | HPA (Kubernetes) |
| Mongo connections >80% pool | Alert | `db.serverStatus().connections` |
| Redis memory >80% | Evict + scale | `INFO memory` |
| Error rate >1% | Page on-call | Sentry + PagerDuty |

---

## 6) الخلاصة

> **بـ $105/شهر + Cloudflare Rules (5 دقائق) + نشر `perf/gen2-part2` → 50→50,000 VU (1000×)**
> **بـ $500/شهر + 10 pods → 500,000 VU متزامن، p95 <100ms**

**الخطوة التالية الفورية (5 دقائق):**
1. افتح PR `perf/gen2-part2` → Merge → Deploy staging
2. فعّل Cloudflare Rules من Dashboard
3. أعد اختبار load: `k6 run --vus 1000 --duration 30s` → متوقع p95 <500ms

*الخطة كاملة — لا حاجة لكود إضافي قبل 10K، فقط نشر وتفعيل.*
