import { KILLSWITCH_FEATURES } from '../../common/killswitches/killswitches.helper';

/**
 * needs-review admin-system item 10: the only feature flags a server check actually reads. The admin "flags" tab lists and
 * writes these and nothing else: any other key (the env-only `telehealth`, `home_visit`, ... names, or a free-typed key)
 * changed nothing, because no backend module and no client reads it. Whole services are switched on the module
 * switches page, and single actions on the kill-switch page.
 *
 * Each entry names the code that reads it (absent row = ON, except sms_enabled whose default is the SMS_ENABLED env).
 */
export interface EffectiveFlag { key: string; name: string; effect: string }

export const EFFECTIVE_FLAGS: readonly EffectiveFlag[] = [
  // ai-gateway.service.ts generate(): every AI call is refused (no provider request, nothing billed).
  { key: KILLSWITCH_FEATURES.ai, name: 'استدعاءات الذكاء الاصطناعي', effect: 'عند التعطيل يرفض الخادم كل طلب للذكاء الاصطناعي ولا يرسل شيئاً لمزود النموذج. إخفاء خدمة المساعد من التطبيق يتم من مفاتيح الخدمات.' },
  // product-ranking.service.ts getRankedDrugIds(): catalogue order without behaviour signals.
  { key: KILLSWITCH_FEATURES.recommendations, name: 'الترتيب المخصص للمنتجات', effect: 'عند التعطيل تُعرض المنتجات بترتيب الكتالوج الثابت بدل الترتيب حسب سلوك المستخدمين.' },
  // engagement.controller.ts: nothing is enqueued, queued nudges are dropped.
  { key: KILLSWITCH_FEATURES.nudges, name: 'التذكيرات التسويقية', effect: 'عند التعطيل لا تُجدول تذكيرات جديدة وتُلغى المجدولة قبل إرسالها.' },
  // ops.controller.ts live-map: empty static answer instead of live positions.
  { key: KILLSWITCH_FEATURES.liveMap, name: 'الخريطة الحية للعمليات', effect: 'عند التعطيل تعرض خريطة العمليات في لوحة الإدارة نتيجة فارغة بدل المواقع الحية.' },
  // medicines.service.ts: search analytics are not written.
  { key: KILLSWITCH_FEATURES.analyticsIngestion, name: 'تسجيل تحليلات البحث', effect: 'عند التعطيل لا تُسجل عمليات البحث في التحليلات؛ البحث نفسه يعمل.' },
  // medicines.service.ts didYouMean(): no suggestion.
  { key: KILLSWITCH_FEATURES.searchSuggestions, name: 'اقتراحات البحث', effect: 'عند التعطيل لا يظهر «هل تقصد؟» عند بحث بلا نتائج.' },
  // sms.service.ts isEnabled(): the SMS channel.
  { key: 'sms_enabled', name: 'الرسائل النصية SMS', effect: 'عند التعطيل لا يرسل الخادم أي رسالة نصية. بلا قيمة محفوظة يتبع إعداد الخادم SMS_ENABLED.' },
];

export const EFFECTIVE_FLAG_KEYS: readonly string[] = EFFECTIVE_FLAGS.map((f) => f.key);
