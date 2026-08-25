# بوابات الإنتاج: الأمن والأداء والاختبار والتشغيل

## المبدأ

هذه بوابات قبول مقترحة قبل أي ادعاء إنتاجي. لا تمثل امتثالًا قانونيًا أو شهادة PCI أو تحقيقًا تلقائيًا لمعيار OWASP/NIST. معيار OWASP ASVS يوفر أساسًا لاختبار الضوابط الأمنية التقنية ومتطلبات تطوير آمن.[1] وPCI DSS يحدد متطلبات تقنية وتشغيلية لحماية بيانات حسابات الدفع للجهات التي تخزنها أو تعالجها أو تنقلها أو تؤثر في بيئتها.[2] كما يقسم NIST SSDF الممارسات إلى إعداد المؤسسة وحماية البرمجيات وإنتاج برمجيات مؤمنة والاستجابة للثغرات.[3]

## G1. Security and privacy release gate

| المجال | شرط الإغلاق | دليل مطلوب |
|---|---|---|
| Identity | secure HTTP-only cookies، MFA/OTP/passkey lifecycle، revocation، rate limits، session/device risk | auth contract tests + independent security review |
| Authorization | owner/stranger/unauth/wrong-role لكل read/write حساس، admin/provider least privilege | automated negative matrix ونماذج BOLA/IDOR defense |
| Input and output | typed DTO validation، canonicalization، output allowlists، upload/media controls | contract tests، fuzz/negative cases، security review |
| Secrets | managed secrets، rotation، no secrets in archive/log/client/build artifact | secret scan، key inventory، rotation drill |
| PHI/PII | data minimization، scoped access، redacted logs، retention/deletion/export، encrypted transport/storage | data-flow review، access log evidence، privacy/legal sign-off |
| Browser/mobile | CSP/CSRF/origin controls، secure storage، deep-link validation، certificate/network policy as applicable | header/device/security test evidence |
| Dependencies | pinned lockfiles، SBOM، vulnerability triage and remediation policy | signed CI artifacts، dependency inventory |

## G2. Payments, insurance, and financial truth gate

لا يسجل النظام أو الشاشة payment success أو insurance approval قبل أن يصبح source-of-truth الخادمي صريحًا ومتسقًا. بطاقة الدفع لا تدخل النظام كمعلومات خام؛ يستخدم موفر الدفع tokenization/hosted fields أو integration معتمدة، مع مراجعة scope القانوني والتعاقدي وفق المزود وPCI DSS.[2]

| السيطرة | شرط الإغلاق |
|---|---|
| Intent/webhook | signed verification، replay/deduplication، ordering policy، immutable provider reference |
| Ledger | immutable entries، reconciliation، no client-calculated totals، refund/dispute links |
| Insurance | request/decision/reference/co-pay/expiry/audit server-authoritative؛ full/partial/reject explicit |
| Pharmacy | request broadcast → offers → single selected offer → Cash/Card أو policy COD؛ insurance decision قبل co-pay/confirmation |
| Bookings | slot lock + price/provider selection → cash payment before confirmation؛ insurance decision → co-pay → confirmation |
| Failure | decline/timeout/retry/duplicate webhook/cancel/refund/chargeback policies قابلة للاختبار |

## G3. Reliability, scale, and performance gate

«تحمل الملايين» ليس claim يمكن إثباته من source read. يتحقق فقط بأهداف سعة وSLOs قابلة للقياس، workload ممثل، وأدلة اختبارات تحت حمل، ومراقبة تشغيلية. يجب اعتماد أرقام SLO/RTO/RPO والسعة من المالك وفرق المنصة؛ لا تُخترع في هذه الخطة.

| الطبقة | قرار/اختبار مطلوب |
|---|---|
| Capacity model | traffic model حسب endpoint/tenant/region، concurrency، read/write mix، media، websocket/call traffic، growth assumptions |
| Load and stress | baseline، peak، soak، stress، failure injection؛ test data معزولة ولا تستخدم PHI/production accounts |
| Database | index/query plans، connection pools، replica/backup/PITR، failover test، write concern policy |
| Cache/queues | bounded retries، exponential backoff+jitter، idempotent consumers، DLQ، consumer lag SLO، cache stampede controls |
| APIs | p95/p99 latency، error budget، payload limits، pagination، quotas/rate limits، circuit breakers/timeouts |
| Realtime/media | websocket/LiveKit/TURN capacity model، token TTL، network segmentation، fallbacks، call-quality monitoring |
| Observability | structured logs with correlation IDs، metrics/traces، dashboards، alerts linked to runbooks، synthetic checks |
| Resilience | restore drill، regional/service dependency failure scenarios، rollback and feature-flag kill switch |

## G4. Quality and user experience gate

| السطح | إثبات مطلوب |
|---|---|
| Patient Mobile | physical-device matrix، Android/iOS versions المعتمدة، poor-network/offline behavior، RTL/Arabic، screen reader، reduced motion، crash-free monitoring |
| Patient Web | browser matrix، responsive/keyboard/screen-reader، SSR/SEO truthfulness، Core Web Vitals targets المعتمدة، no private indexing |
| Provider | role workflows، interruption/retry، PHI minimization، practical field/clinic flows |
| Admin | granular RBAC، maker-checker، audit visibility، safe destructive-action UX |
| جميع الأسطح | no mock/placeholder in real path، explicit loading/empty/error/retry/cancel states، localized content review |

## G5. Testing and evidence gate

لا تستخدم tests محلية أو seeding مباشر أو skipped tests كبديل عن acceptance. لكل slice:

1. static review وcontract lint قبل البناء؛
2. unit/service/controller tests؛
3. contract tests لmethod/path/DTO/error/security؛
4. owner/stranger/unauth/wrong-role؛
5. idempotency replay/concurrency/expiry/timezone؛
6. payment/insurance/webhook/ledger negative matrix في sandbox مصرح؛
7. E2E عبر UI حقيقي ضد sandbox test accounts فقط؛
8. accessibility/performance/security scans؛
9. migration/backup/rollback drill إن وجد تغيير data؛
10. independent evidence review وremote commit verification.

أي test يحتاج payment provider أو SMS أو insurance/provider workflow أو device حقيقي يبقى `RUNTIME_OR_EXTERNAL_VERIFICATION_REQUIRED` حتى ينفذ فعليًا ببيئة معزولة وauthorization صريح.

## G6. Release and incident gate

| العمل | شرط الإغلاق |
|---|---|
| CI/CD | protected branch، review policy، reproducible build، signed provenance/SBOM، secret-free logs |
| Deployment | staged/controlled rollout حيث توافق عليه الإدارة، feature flags، compatibility window، verified rollback |
| Data | backups encryption، restore test، migration checksum، data retention and deletion playbook |
| Incident response | severity model، on-call, comms, containment, security/financial/clinical escalation، post-incident review |
| Legal/compliance | jurisdiction-specific healthcare/privacy/payment/legal review؛ لا تدعي الخطة الامتثال بدل اعتماد مختص |

## المراجع

[1]: [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)

[2]: [PCI Security Standards Council — PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/)

[3]: [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf)
