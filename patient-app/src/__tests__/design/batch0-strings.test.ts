import { autoTranslate } from '../../i18n';
import type { LangCode } from '../../context/AppContext';

/**
 * Batch 0 (search, notifications, onboarding): every Arabic source string the three screens show is translated into
 * the five other languages through the app's i18n layer (autoTranslations, keyed by the Arabic text), as the sign-in
 * screens are. A string missing here would show in Arabic to an English, Urdu, Hindi, Bengali or Filipino reader.
 */

const STRINGS: Record<string, string[]> = {
  search: [
    'ابحث عن دواء، طبيب، تحليل…', 'بحث', 'مسح', 'ماسح الأدوية', 'إلغاء',
    'الكل', 'أدوية', 'أطباء', 'تحاليل', 'أشعة', 'عروض', 'مقالات', 'أمراض', 'تأمين', 'عائلة',
    'أدوية ومنتجات', 'تحاليل وأشعة', 'مقالات ومعلومات',
    'ر.س', 'إعلان', 'جاري التحميل...',
    'عمليات البحث الأخيرة', 'تصفّح حسب القسم',
    'الصيدلية', 'استشارة', 'تمريض', 'صحة نفسية', 'تغذية', 'العائلة',
    'لا يوجد اتصال بالإنترنت', 'اتصل بالشبكة ثم حاول مرة أخرى.', 'إعادة المحاولة',
    'تعذر تنفيذ البحث', 'تحقق من اتصالك ثم حاول مرة أخرى.',
    'لا توجد نتائج', 'جرّب كلمة أخرى أو تحقق من الإملاء.',
    'لم تجد ما تبحث عنه؟ ارفع الوصفة وتبحث الصيدليات عنه لك', 'رفع الوصفة',
  ],
  notifications: [
    'الإشعارات', 'رجوع', 'قراءة الكل', 'تحديثات', 'طبي', 'اليوم', 'سابقًا', 'جديد',
    'الآن', 'أمس', 'منذ {n} دقيقة', 'منذ {n} ساعة', 'منذ {n} يوم',
    'تعذر تحميل الإشعارات', 'لا توجد إشعارات بعد', 'ستظهر هنا تنبيهات مواعيدك وأدويتك وعروضك',
  ],
  onboarding: [
    'نبض بلس', 'تخطي', 'التالي', 'ابدأ رحلتك الصحية',
    'رعايتك الصحية الشاملة', 'احجز أفضل الأطباء في جميع التخصصات في ثوانٍ',
    'صيدليتك في جيبك', 'اطلب الأدوية والمستلزمات الطبية مع توصيل سريع لبابك',
    'فحوصاتك من المنزل', 'احجز التحاليل والأشعة مع زيارة منزلية وأسعار مقارنة',
    'تمريض متخصص في بيتك', 'خدمات تمريضية احترافية على مدار الساعة في منزلك',
    'ذكاء اصطناعي يرافق صحتك', 'مساعد ذكي يحلل أعراضك ويترجم وصفاتك ويتابع صحتك يومياً',
    'اختر لغتك', 'يمكنك تغييرها لاحقًا من الإعدادات.', 'متابعة',
    'الصلاحيات المطلوبة', 'نحتاج بعض الأذونات لتقديم أفضل تجربة',
    'الكاميرا', 'الموقع',
    'تذكيرات الأدوية والمواعيد والعروض', 'مسح الوصفات والباركود وتصوير الأدوية', 'البحث عن أقرب صيدلية ومختبر وطبيب',
    'السماح', 'تم السماح', 'فتح الإعدادات', 'تخطي الآن',
  ],
};

const OTHERS: LangCode[] = ['en', 'ur', 'hi', 'bn', 'fil'];

describe.each(Object.entries(STRINGS))('%s strings', (_screen, strings) => {
  it.each(strings)('%s is translated into en, ur, hi, bn and fil', (ar) => {
    expect(autoTranslate(ar, 'ar')).toBe(ar);
    for (const lang of OTHERS) {
      const out = autoTranslate(ar, lang) as string;
      expect(typeof out).toBe('string');
      expect(out.trim().length).toBeGreaterThan(0);
      // not left in Arabic (the riyal symbol is the same in Arabic and Urdu: owner 2026-10-10)
      if (!(ar === 'ر.س' && lang === 'ur')) expect(out).not.toBe(ar);
      if (ar.includes('{n}')) expect(out).toContain('{n}');
    }
  });
});
