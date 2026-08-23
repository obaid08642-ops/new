# Phase 12 — Article detail indexing

صفحة تفاصيل المقال الحالية تتحقق من `slug` وتتعامل مع 404 بشكل صحيح، لكنها تعرض العنوان والمقتطف وإشعاراً بأن body مخفي. لذلك لم أضف `Product` أو `Article` JSON-LD ولم أرفعها إلى index؛ فالفهرسة يجب أن تطابق المحتوى الظاهر فعلياً ولا توحي بمقال كامل غير معروض.

قائمة المقالات العامة أصبحت قابلة للفهرسة، أما تفاصيل المقالات فتبقى noindex inherited من locale layout حتى يثبت backend body contract، parser للمحتوى، canonical/OG image، وstructured data مطابق للواجهة. هذا قرار truthfulness وليس نقصاً مخفياً.
