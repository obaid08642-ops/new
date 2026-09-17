# سجلات DNS المطلوبة — nabd.plus

أضف هذه السجلات عند مسجّل الدومين (Nameservers). استبدل `<SERVER_IP>` بعنوان السيرفر العام.

| النوع | الاسم | القيمة | TTL | ملاحظة |
|---|---|---|---|---|
| A | `api.nabd.plus` | `<SERVER_IP>` | 300 | الباك إند (NestJS + Socket.IO) |
| A | `admin.nabd.plus` | `<SERVER_IP>` | 300 | لوحة الأدمن (Next.js) |
| A | `provider.nabd.plus` | `<SERVER_IP>` | 300 | صفحة هبوط المزودين (التطبيق موبايل) |
| A | `live.nabd.plus` | `<SERVER_IP>` | 300 | LiveKit WebSocket (wss) |
| A | `turn.nabd.plus` | `<SERVER_IP>` | 300 | Coturn STUN/TURN — **مباشر بدون بروكسي** (UDP) |
| A | `nabd.plus` (الجذر) | `<SERVER_IP>` | 300 | اختياري — إعادة توجيه لاحقاً |

## cdn.nabd.plus — خياران

**الخيار 1 (موصى به): ربط R2 مباشرة عبر Cloudflare**
انقل Nameservers للدومين إلى Cloudflare، ثم من لوحة R2:
`R2 Bucket → Settings → Custom Domains → Connect Domain → cdn.nabd.plus`
سينشئ Cloudflare السجل تلقائياً (CNAME برتقالي Proxied) — صور الأدوية تُقدَّم عبر CDN العالمي مجاناً بدون أي سيرفر منك.

**الخيار 2 (بدون Cloudflare):**
| A | `cdn.nabd.plus` | `<SERVER_IP>` | 300 | Nginx يعمل بروكسي+كاش أمام رابط R2 العام |

## بعد إضافة السجلات

```bash
cd /opt/nabdah/deploy
bash scripts/issue-certs.sh   # إصدار شهادات SSL للنطاقات الجديدة
bash scripts/health-check.sh  # تحقق شامل
```

## ملاحظات
- `turn.nabd.plus` يجب أن يكون **DNS فقط** (رمادي إن كان عند Cloudflare) — TURN يعمل عبر UDP مباشرة ولا يمر عبر بروكسي Cloudflare.
- `live.nabd.plus` WebSocket — إن كان DNS عند Cloudflare فهو يدعم WebSocket على الباقة المجانية، لكن الأفضل أيضاً DNS فقط (رمادي) لتفادي أي حدود.
- TTL منخفض (300) في البداية يسهّل التصحيح؛ ارفعه لاحقاً.

---

## سجلات اكتشاف الوكلاء الأذكياء — DNS for AI Discovery (DNS-AID) (RFC 9460)

أضف هذه السجلات في لوحة تحكم Cloudflare DNS لنطاق `nabd.plus` لتمكين محركات وبوتات الذكاء الاصطناعي من اكتشاف الوكلاء تلقائياً عبر بروتوكول DNS-AID:

| النوع | الاسم | القيمة / المعلمات | TTL | ملاحظة |
|---|---|---|---|---|
| **HTTPS** / **SVCB** | `_index._agents.nabd.plus` | `1 nabd.plus. alpn="h2,h3" port=443 mandatory=alpn,port` | Auto | نقطة دخول اكتشاف الفهرس الرئيسي |
| **HTTPS** / **SVCB** | `_a2a._agents.nabd.plus` | `1 nabd.plus. alpn="h2,h3" port=443 mandatory=alpn,port` | Auto | نقطة اكتشاف بروتوكول Agent-to-Agent (A2A) |
| **HTTPS** / **SVCB** | `_mcp._agents.nabd.plus` | `1 api.nabd.plus. alpn="h2,h3" port=443 mandatory=alpn,port` | Auto | نقطة اكتشاف بروتوكول Model Context Protocol (MCP) |
| **TXT** | `_index._agents.nabd.plus` | `"v=aid1; uri=https://nabd.plus/.well-known/ai-catalog.json"` | Auto | الفهرس النصي المباشر لكتالوج الوكلاء |
| **TXT** | `_catalog._agents.nabd.plus` | `"url=https://nabd.plus/.well-known/ai-catalog.json"` | Auto | رابط كتالوج ARD لاكتشاف الموارد |

> **تفعيل DNSSEC**: تأكد من تفعيل DNSSEC في لوحة Cloudflare (DNS -> Settings -> Enable DNSSEC) لضمان توقيع السجلات رقمياً واجتياز الفحص الأمني التام.
