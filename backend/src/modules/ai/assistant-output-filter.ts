/**
 * OD-15: the output filter on the AI assistant's answer. Whatever produced the text (the server's own rules, the catalogue leaflet or,
 * one day, a model), the answer that leaves the server never contains
 *   - a DOSE (a number with a unit, a dosing frequency, "a dose of"),
 *   - a DRUG NAME it introduces (a catalogue medicine the user did not name themselves), or
 *   - DIAGNOSIS phrasing ("you have ...", "you are suffering from ...", "the diagnosis is ...").
 * Arabic and English are matched explicitly (digits in both scripts); a violation replaces the whole answer with the safe
 * "please consult a doctor" text and the consultation button. Fail closed: the filter has no "mostly fine" outcome.
 */

export type Violation = 'dose' | 'drug' | 'diagnosis';

const AR_DIGITS = '٠-٩';
const NUM = `[\\d${AR_DIGITS}][\\d${AR_DIGITS}.,٫]*`;

/** A number with a dose unit (mg, ml, tablets, drops ...) in Arabic or English. */
const DOSE_AMOUNT = new RegExp(
  `${NUM}\\s*(?:-\\s*${NUM}\\s*)?(?:mg|mcg|µg|ug|g|gm|gram|grams|kg|ml|cc|l|iu|units?|tablets?|tabs?|capsules?|caps|pills?|drops?|puffs?|sprays?|sachets?|ampoules?|doses?|teaspoons?|tsp|tablespoons?|tbsp|ملغ|ملجم|مجم|مللي|ملي|مل|جم|جرام|غرام|وحدة|وحدات|حبة|حبات|حبتين|قرص|أقراص|اقراص|قرصين|كبسولة|كبسولات|قطرة|قطرات|بخة|بخات|كيس|أكياس|اكياس|أمبول|جرعة|جرعات|ملعقة|ملاعق)(?![a-z\\u0600-\\u06FF])`,
  'i',
);
/** Dosing frequency: "twice a day", "every 8 hours", "3 times daily", "مرتين يوميا", "كل 8 ساعات". */
const DOSE_FREQUENCY = new RegExp(
  `\\b(?:once|twice|thrice)\\s+(?:a|per|each)\\s+(?:day|night|week)\\b|\\b(?:once|twice)\\s+daily\\b|\\b${NUM}\\s*(?:x|×|times)\\s*(?:a|per|each)?\\s*(?:day|daily|night|week)\\b|\\bevery\\s+${NUM}\\s*(?:hours?|hrs?|h)\\b|\\bq\\d+h\\b|\\b(?:bid|tid|qid)\\b|\\b(?:morning and (?:evening|night)|at bedtime|before (?:meals|bed)|after meals)\\b` +
    `|(?:مرة|مرتين|مرتان|ثلاث مرات|أربع مرات|اربع مرات|${NUM}\\s*مرات?)\\s*(?:في اليوم|يوميا|يومياً|باليوم|يومي|في الأسبوع|اسبوعيا|أسبوعياً)|كل\\s+(?:${NUM}\\s*)?(?:ساعة|ساعات|يوم|أيام|ايام)|قبل (?:النوم|الأكل|الاكل|الطعام)|بعد (?:الأكل|الاكل|الطعام)|صباحا ومساء|صباحاً ومساءً`,
  'i',
);
const AR_L = '(?<![\\u0600-\\u06FF])';
const DOSE_WORD = new RegExp(`\\b(?:dose|dosage|dosing|overdose|prescribe[sd]?|take (?:one|two|three|1|2|3|a|an|the)\\b)|${AR_L}(?:ال)?جرعة|${AR_L}خذ\\s+(?:حبة|حبتين|قرص|قرصين|كبسولة|ملعقة|\\d|[٠-٩])|${AR_L}تناول\\s+(?:حبة|حبتين|قرص|قرصين|كبسولة|ملعقة|الدواء|الأدوية|الدواء)`, 'i');

const EN_DISEASE = 'infection|disease|syndrome|disorder|diabetes|angina|cancer|asthma|pneumonia|migraine|allergy|flu|influenza|covid|hypertension|anemia|anaemia|ulcer|arthritis|tumou?r|appendicitis|bronchitis|tonsillitis|gastritis|conjunctivitis|eczema|psoriasis|depression|anxiety|fever|hay fever|sinusitis|infected';
const AR_DISEASE = 'التهاب|مرض|عدوى|سكري|السكري|ضغط|ربو|الربو|حساسية|ذبحة|سرطان|التهابات|فقر دم|قرحة|جلطة|صداع نصفي|نزلة|إنفلونزا|انفلونزا|ورم|إكزيما|اكزيما|أكزيما|صدفية|التهاب لوزتين|عدوى بولية|ارتفاع ضغط|انخفاض الضغط|نقص';

/** Diagnosis phrasing in English and Arabic. */
const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou (?:have|has|got|are having|are suffering from|suffer from|are diagnosed with|probably have|likely have|may have|might have|could have|most likely have|definitely have)\b\s+(?!any\b|no\b|a (?:question|doubt|concern|problem with the app)\b)/i,
  /\byou(?:'| a)re (?:suffering from|diagnosed with|likely|probably|clearly|definitely|infected|having an?)\b/i,
  new RegExp(`\\b(?:this|that|it) (?:is|looks like|seems like|sounds like|could be|might be|may be|is probably|is likely|is most likely)\\s+(?:an?\\s+)?(?:\\w+\\s+){0,2}(?:${EN_DISEASE})\\b`, 'i'),
  new RegExp(`\\b(?:he|she|they|your (?:son|daughter|child|mother|father|baby)|the (?:child|patient)) (?:has|have|is suffering from|may have|might have|probably has|likely has|most likely has)\\s+(?:an?\\s+)?(?:\\w+\\s+){0,2}(?:${EN_DISEASE})\\b`, 'i'),
  /\b(?:the|your|my) diagnosis\b|\bdiagnos(?:is|ed|e) (?:is|as|with)\b|\bI (?:diagnose|think you have|believe you have)\b|\bit(?:'s| is) (?:definitely|certainly|surely)\b/i,
  /\byour (?:symptoms|condition) (?:indicate|suggest|mean|show|point to)\b/i,
  /تشخيصك|التشخيص\s+(?:هو|هي|أنك|انك|أن)|تم تشخيص|شخّصت|شخصت|أشخّص|اشخص/,
  new RegExp(`${AR_L}(?:أنت|انت|أنتِ|انتِ)\\s+(?:مصاب|مصابة|تعاني|تعانين)`),
  new RegExp(`${AR_L}(?:لديك|عندك|لديه|عنده|لديها|عندها|لدى|عند)\\s+(?:ال)?(?:${AR_DISEASE})`),
  new RegExp(`${AR_L}(?:تعاني|تعانى|يعاني|تعانين)\\s+من\\s+(?!قلق عام)`),
  new RegExp(`${AR_L}(?:قد|ربما|يبدو أن|يبدو انك|على الأرجح|غالباً|غالبا|أغلب الظن|أعتقد|اعتقد)\\s+(?:(?:تكون|يكون|تكونين|أنك|انك|أن لديك|ان لديك|أنه|انه|هو|هي)\\s+)?(?:مصاب|مصابة|(?:ال)?(?:${AR_DISEASE}))`),
  new RegExp(`${AR_L}(?:هذا|هذه|ذلك|تلك|هو|هي)\\s+(?:هو\\s+|هي\\s+)?(?:ال)?(?:${AR_DISEASE})`),
  /(?:الأعراض|اعراضك|أعراضك|حالتك)\s+(?:تدل|تشير|تعني|توحي)\s+(?:على|إلى|الى)/,
];

export function hasDose(text: string): boolean {
  return DOSE_AMOUNT.test(text) || DOSE_FREQUENCY.test(text) || DOSE_WORD.test(text);
}

export function hasDiagnosis(text: string): boolean {
  return DIAGNOSIS_PATTERNS.some((re) => re.test(text));
}

/** True when `name` appears in `text` as a word (Latin names on word boundaries, Arabic and other scripts as a substring). */
export function mentionsName(text: string, name: string): boolean {
  const n = name.trim();
  if (n.length < 3) return false;
  if (/^[a-z0-9][a-z0-9\s\-/]*$/i.test(n)) {
    return new RegExp(`(?:^|[^a-z0-9])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![a-z0-9])`, 'i').test(text);
  }
  return text.includes(n);
}

/**
 * The violations in `text`. `catalogueNames` is every medicine name of the catalogue (ar, en, generic, active ingredient, translations);
 * `userText` is what the user wrote: a drug the user named themselves may be repeated back, one the answer brings in may not.
 */
export function scan(text: string, catalogueNames: Iterable<string>, userText = ''): Violation[] {
  const found = new Set<Violation>();
  if (hasDose(text)) found.add('dose');
  if (hasDiagnosis(text)) found.add('diagnosis');
  for (const name of catalogueNames) {
    if (mentionsName(text, name) && !mentionsName(userText, name)) { found.add('drug'); break; }
  }
  return [...found];
}

export const SAFE_TEXT: Record<string, string> = {
  ar: 'لا أستطيع تقديم تشخيص أو اسم دواء أو جرعة. يرجى استشارة طبيب، وهو الأنسب لحالتك.',
  en: "I can't give a diagnosis, a medicine or a dose. Please consult a doctor, who is the right person for your case.",
  ur: 'میں تشخیص، دوا کا نام یا خوراک نہیں بتا سکتا۔ براہِ کرم ڈاکٹر سے مشورہ کریں۔',
  hi: 'मैं निदान, दवा का नाम या खुराक नहीं बता सकता। कृपया डॉक्टर से परामर्श करें।',
  bn: 'আমি রোগ নির্ণয়, ওষুধের নাম বা ডোজ বলতে পারি না। অনুগ্রহ করে একজন ডাক্তারের পরামর্শ নিন।',
  fil: 'Hindi ako makapagbibigay ng diagnosis, pangalan ng gamot o dosis. Mangyaring kumonsulta sa doktor.',
};
