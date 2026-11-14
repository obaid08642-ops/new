/**
 * Known drug-drug interactions (the names are matched as substrings of lower-cased drug names, Arabic and English).
 * `code` is what the patient apps translate (six languages); note_ar stays for older readers.
 */
export interface InteractionRule { a: string[]; b: string[]; severity: string; code: string; note_ar: string }

export const INTERACTION_RULES: InteractionRule[] = [
  { a: ['warfarin', 'وارفارين'], b: ['aspirin', 'أسبرين', 'ibuprofen', 'ايبوبروفين'], severity: 'high', code: 'bleeding_risk', note_ar: 'زيادة خطر النزيف — راجع الطبيب فوراً' },
  { a: ['metformin', 'ميتفورمين'], b: ['alcohol', 'كحول'], severity: 'moderate', code: 'lactic_acidosis', note_ar: 'خطر الحماض اللبني — تجنب الكحول' },
  { a: ['lisinopril', 'ليزينوبريل'], b: ['potassium', 'بوتاسيوم'], severity: 'moderate', code: 'high_potassium', note_ar: 'ارتفاع البوتاسيوم — مراقبة دورية' },
  { a: ['sildenafil', 'سيلدينافيل'], b: ['nitroglycerin', 'نيتروجليسرين'], severity: 'high', code: 'severe_low_blood_pressure', note_ar: 'هبوط حاد في الضغط — ممنوع الدمج' },
  { a: ['simvastatin', 'سيمفاستاتين'], b: ['clarithromycin', 'كلاريثرومايسين'], severity: 'high', code: 'rhabdomyolysis', note_ar: 'خطر انحلال الربيدات — بدّل المضاد الحيوي' },
];

export interface InteractionHit { severity: string; code: string; note_ar: string }

const hit = (rule: InteractionRule): InteractionHit => ({ severity: rule.severity, code: rule.code, note_ar: rule.note_ar });
const mentions = (names: string[], keys: string[]) => names.some((d) => keys.some((k) => d.includes(k)));

/** Every rule whose two sides both appear in one list of drug names (the check of the patient's own medicines). */
export function matchInteractions(names: string[]): InteractionHit[] {
  const all = names.map((d) => d.toLowerCase());
  return INTERACTION_RULES.filter((r) => mentions(all, r.a) && mentions(all, r.b)).map(hit);
}

/** Every rule that pairs a name from one list with a name from the other, in either direction. */
export function pairInteractions(left: string[], right: string[]): InteractionHit[] {
  const l = left.map((d) => d.toLowerCase());
  const r = right.map((d) => d.toLowerCase());
  return INTERACTION_RULES
    .filter((rule) => (mentions(l, rule.a) && mentions(r, rule.b)) || (mentions(l, rule.b) && mentions(r, rule.a)))
    .map(hit);
}
