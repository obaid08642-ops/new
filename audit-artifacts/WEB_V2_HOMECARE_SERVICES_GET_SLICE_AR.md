# V2 Contract Slice — Home-care Services

تم تنفيذ مساري GET العامين المطابقين لـMobile وOpenAPI:

- `GET /api/v1/home-care/services`
- `GET /api/v1/home-care/services/{id}`

أضيفت قائمة `/[locale]/home-care/services` وتفاصيل `/[locale]/home-care/services/[serviceId]`. parser يحافظ فقط على `id`, `slug`, الأسماء والوصف المحلي، السعر، المدة، وinsurance availability؛ ويسقط `patient_id` والحقول الداخلية. service IDs تقبل نمطًا آمنًا alphanumeric/hyphen/underscore فقط، وترفض البريد أو المسارات التي تحمل PII.

الـwrapper public لا يرسل Authorization أو session، ولا يعرض fallback أو mock data. تفاصيل الخدمة لا تحتوي CTA ينفذ booking؛ صفحة الحجز تبقى منفصلة ومحجوبة حتى تثبيت عقد create/idempotency/slot locking.

أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وCSS responsive ببطاقات glass وحركة 180ms وfocus states و`prefers-reduced-motion`.

## Gates

- `pnpm check`: PASS.
- Home-care parser/wrapper/SSR: 3 files، 6 tests PASS.
- `pnpm build`: PASS، وظهر مسارا القائمة والتفاصيل.
- full `pnpm test`: baseline يُعاد تشغيله في gate النهائي بعد commit.
