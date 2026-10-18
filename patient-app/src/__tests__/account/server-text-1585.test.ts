import { STORAGE_ITEM_KEYS, faqText, isStorageItemKey } from '../../components/account/serverText';
import ar from '../../i18n/locales/ar.json';
import en from '../../i18n/locales/en.json';
import ur from '../../i18n/locales/ur.json';
import hi from '../../i18n/locales/hi.json';
import bn from '../../i18n/locales/bn.json';
import tl from '../../i18n/locales/tl.json';

// issue 1585: storage items and FAQs the server sends are shown in the app language, never Arabic-only.
const ARABIC = /[؀-ۿ]/;
const fallbackFaq = {
  id: '1', question: 'كيف أحجز موعد؟', answer: 'يمكنك الحجز',
  question_ar: 'كيف أحجز موعد؟', answer_ar: 'يمكنك الحجز',
  question_en: 'How do I book an appointment?', answer_en: 'You can book from the clinics section.',
  question_ur: 'میں اپائنٹمنٹ کیسے بک کروں؟', answer_ur: 'آپ کلینکس کے سیکشن سے بک کر سکتے ہیں۔',
  question_hi: 'मैं अपॉइंटमेंट कैसे बुक करूँ?', answer_hi: 'आप क्लिनिक सेक्शन से बुक कर सकते हैं।',
  question_bn: 'আমি কীভাবে অ্যাপয়েন্টমেন্ট বুক করব?', answer_bn: 'আপনি ক্লিনিক বিভাগ থেকে বুক করতে পারেন।',
  question_fil: 'Paano ako magpapa-book ng appointment?', answer_fil: 'Maaari kang mag-book mula sa seksyon ng mga klinika.',
};

describe('issue 1585 server texts in the app language', () => {
  it('names every storage key in all six locale files', () => {
    for (const locale of [ar, en, ur, hi, bn, tl] as Array<Record<string, string>>) {
      for (const key of STORAGE_ITEM_KEYS) expect((locale[`set.data.item.${key}`] || '').trim()).not.toBe('');
    }
    expect(ARABIC.test((en as Record<string, string>)['set.data.item.uploaded_prescriptions'])).toBe(false);
  });

  it('accepts only the known storage keys', () => {
    expect(isStorageItemKey('medical_reports')).toBe(true);
    expect(isStorageItemKey('التقارير الطبية')).toBe(false);
    expect(isStorageItemKey(undefined)).toBe(false);
  });

  it('picks the FAQ text by app language (tl reads fil) and falls back to English, then the plain fields', () => {
    expect(faqText(fallbackFaq, 'en').question).toBe('How do I book an appointment?');
    expect(faqText(fallbackFaq, 'tl').answer).toBe('Maaari kang mag-book mula sa seksyon ng mga klinika.');
    expect(faqText(fallbackFaq, 'ar').question).toBe('كيف أحجز موعد؟');
    for (const lang of ['en', 'hi', 'bn', 'tl']) expect(ARABIC.test(JSON.stringify(faqText(fallbackFaq, lang)))).toBe(false);
    expect(faqText({ question: 'س', question_en: 'Q', answer: 'ج', answer_en: 'A' }, 'hi')).toEqual({ question: 'Q', answer: 'A' });
    expect(faqText({ q: 'Plain', a: 'Body' }, 'en')).toEqual({ question: 'Plain', answer: 'Body' });
  });
});
