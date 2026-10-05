/**
 * a95be9a / 7B-B4: AI health results from the backend (POST /ai/triage,
 * /ai/skin-analysis via the BFF routes) are structured:
 *   triage: { care_level: 'emergency' | 'consultation', notice, disclaimer: { ar, en } }
 *   skin:   { care_level: 'clinical_assessment' | 'self_observation', notice, disclaimer: { ar, en } }
 * These helpers turn them into what the web forms show: the guidance for the
 * returned care level and the server's medical disclaimer in the page language.
 */
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function source(payload: unknown): Record<string, unknown> | null {
  const root = record(payload);
  return record(root?.data) ?? root;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The server disclaimer in the page language (Arabic for `ar`, English otherwise), or null. */
export function extractAiDisclaimer(payload: unknown, locale: string): string | null {
  const value = source(payload)?.disclaimer;
  if (typeof value === "string") return text(value);
  const pair = record(value);
  if (!pair) return null;
  return locale === "ar" ? text(pair.ar) ?? text(pair.en) : text(pair.en) ?? text(pair.ar);
}

const TRIAGE_GUIDANCE = {
  emergency: {
    ar: "اخترت علامات قد تحتاج رعاية طارئة. اتصل بالإسعاف (997) أو توجّه إلى أقرب قسم طوارئ الآن.",
    en: "You selected signs that may need emergency care. Call emergency services (997) or go to the nearest emergency department now.",
  },
  consultation: {
    ar: "لم تظهر علامات إنذار من القائمة، وهذا لا يستبعد حالة طبية. استشر طبيبًا إذا استمرت الأعراض أو ساءت.",
    en: "No red flag from the list was selected; that does not rule out a medical condition. Consult a doctor if symptoms persist or worsen.",
  },
} as const;

const SKIN_GUIDANCE = {
  clinical_assessment: {
    ar: "اخترت تغيرات جلدية قد تحتاج تقييم مختص. هذه الملاحظات ليست تشخيصًا.",
    en: "You selected skin changes that may need assessment by a clinician. These observations are not a diagnosis.",
  },
  self_observation: {
    ar: "عدم اختيار ملاحظة لا يستبعد مشكلة جلدية. اطلب رأيًا طبيًا إذا ظهر تغير جديد أو ساءت الحالة.",
    en: "Not selecting an observation does not rule out a skin problem. Seek clinical advice for any new or worsening change.",
  },
} as const;

function lang(locale: string): "ar" | "en" {
  return locale === "ar" ? "ar" : "en";
}

/** Guidance for a triage result: the returned care level, else a plain text reply field. */
export function describeTriageResult(payload: unknown, locale: string): string | null {
  const data = source(payload);
  if (!data) return null;
  const level = data.care_level;
  if (level === "emergency" || level === "consultation") return TRIAGE_GUIDANCE[level][lang(locale)];
  for (const key of ["response", "reply", "answer", "triage", "assessment", "summary"]) {
    const value = text(data[key]);
    if (value) return value;
  }
  return null;
}

/** Guidance for a skin self-check result (care level), else a plain text result field. */
export function describeSkinResult(payload: unknown, locale: string): string | null {
  const data = source(payload);
  if (!data) return null;
  const level = data.care_level;
  if (level === "clinical_assessment" || level === "self_observation") return SKIN_GUIDANCE[level][lang(locale)];
  for (const key of ["result", "summary", "analysis", "assessment", "reply", "response", "answer"]) {
    const value = text(data[key]);
    if (value) return value;
  }
  return null;
}
