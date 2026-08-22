import type { LangCode } from '../context/AppContext';

export type BottomNavKey = 'home' | 'pharmacy' | 'consultations' | 'diagnostics' | 'nursing';

const labels: Record<LangCode, Record<BottomNavKey, string>> = {
  ar: { home: 'الرئيسية', pharmacy: 'الصيدلية', consultations: 'استشارات', diagnostics: 'تحاليل', nursing: 'تمريض' },
  en: { home: 'Home', pharmacy: 'Pharmacy', consultations: 'Consultations', diagnostics: 'Diagnostics', nursing: 'Nursing' },
  ur: { home: 'ہوم', pharmacy: 'فارمیسی', consultations: 'مشورے', diagnostics: 'تشخیص', nursing: 'نرسنگ' },
  hi: { home: 'होम', pharmacy: 'फार्मेसी', consultations: 'परामर्श', diagnostics: 'जांच', nursing: 'नर्सिंग' },
  bn: { home: 'হোম', pharmacy: 'ফার্মেসি', consultations: 'পরামর্শ', diagnostics: 'ডায়াগনস্টিক', nursing: 'নার্সিং' },
  fil: { home: 'Home', pharmacy: 'Botika', consultations: 'Konsultasyon', diagnostics: 'Diagnostics', nursing: 'Nursing' },
};

export function bottomNavLabel(lang: LangCode, key: BottomNavKey): string {
  return labels[lang]?.[key] || labels.en[key];
}

export function isBottomNavRTL(lang: LangCode): boolean {
  return lang === 'ar' || lang === 'ur';
}
