/**
 * Normalizers for labs/radiology catalogue payloads.
 * The backend returns DB-shaped documents (name_ar/name_en, preparation_ar,
 * fasting_required, included_services, turnaround_hours…) while the UI cards
 * expect friendly fields (name, desc, fasting, testsList, icon, color).
 * Mapping happens here — no screen invents or hardcodes content.
 */
import { pickDbField } from './localize';

const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  blood: { icon: 'flask-outline', color: '#E53935' },
  hormones: { icon: 'chart-line', color: '#7A6BEA' },
  vitamins: { icon: 'pill', color: '#F5A623' },
  immunity: { icon: 'shield-check-outline', color: '#23B5CE' },
  imaging: { icon: 'radiology-box-outline', color: '#5C6BC0' },
  xray: { icon: 'radiology-box-outline', color: '#5C6BC0' },
  ultrasound: { icon: 'waveform', color: '#26A69A' },
  mri: { icon: 'magnet', color: '#8D6E63' },
  ct: { icon: 'focus-field', color: '#78909C' },
};
const DEFAULT_STYLE = { icon: 'flask-outline', color: '#23B5CE' };

export function normalizeLabService(raw: any) {
  if (!raw) return raw;
  const style = CATEGORY_STYLE[String(raw.category || '').toLowerCase()] || DEFAULT_STYLE;
  const prepAr = Array.isArray(raw.preparation_ar) ? raw.preparation_ar : [];
  const prepEn = Array.isArray(raw.preparation_en) ? raw.preparation_en : [];
  const prep = pickDbField({ preparation_ar: prepAr.join('، '), preparation_en: prepEn.join(', ') }, 'preparation');
  return {
    ...raw,
    name: pickDbField(raw, 'name') || raw.name_ar || raw.name_en,
    desc: pickDbField(raw, 'description') || prep || (raw.category ? String(raw.category) : ''),
    image: raw.image_url || undefined,
    oldPrice: raw.old_price || undefined,
    fasting: raw.fasting_required ? `${raw.fasting_hours || 10} ساعة` : 'لا يتطلب صيام',
    testsList: (raw.included_services || []).map((t: any) => (typeof t === 'string' ? t : pickDbField(t, 'name') || t.name_ar || t.name_en)),
    testsCount: (raw.included_services || []).length,
    turnaround: raw.turnaround_hours ? `${raw.turnaround_hours} ساعة` : undefined,
    homeVisit: !!raw.home_visit_supported,
    facilityVisit: !!raw.facility_visit_supported,
    isPopular: (raw.popularity || 0) >= 80,
    icon: style.icon,
    color: style.color,
  };
}

export function normalizeLabList(rows: any[]): any[] {
  return (Array.isArray(rows) ? rows : []).map(normalizeLabService);
}
