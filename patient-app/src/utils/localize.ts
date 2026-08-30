/**
 * Localized field picker for database content.
 *
 * The medicines catalogue stores Arabic/English in dedicated columns
 * (name_ar / name_en, indications_ar / indications_en, ...) and four more
 * languages inside the `translations` map imported from the source export:
 *   translations.ur / translations.hi / translations.bn / translations.tl
 * with v14 key names (e.g. indications_uses, description, how_to_use).
 *
 * Selection rule per the product requirement:
 *   ar → *_ar column
 *   en → *_en column
 *   ur/hi/bn → translations[lang][mappedKey]
 *   fil    → translations.tl[mappedKey]   (Filipino/Tagalog)
 * Fallback chain when a value is missing: *_en → *_ar.
 */
import { LanguageManager } from '../i18n/LanguageManager';

export type DbLang = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'tl';

export function currentDbLang(): DbLang {
  try {
    const locale = String((LanguageManager.getInstance().i18n as any)?.locale || 'ar').toLowerCase();
    if (locale.startsWith('ar')) return 'ar';
    if (locale.startsWith('ur')) return 'ur';
    if (locale.startsWith('hi')) return 'hi';
    if (locale.startsWith('bn')) return 'bn';
    if (locale.startsWith('tl') || locale.startsWith('fil')) return 'tl';
    return 'en';
  } catch {
    return 'ar';
  }
}

/** Maps catalogue field base names to their key inside translations[lang]. */
const TRANSLATION_KEY_MAP: Record<string, string> = {
  name: 'name',
  category: 'main_category',
  sub_category: 'sub_category',
  active_ingredient: 'active_ingredient',
  form: 'dosage_form',
  strength: 'strength',
  description: 'description',
  more_info: 'description',
  indications: 'indications_uses',
  dosage: 'dosage_instructions',
  side_effects: 'side_effects',
  warnings: 'warnings_precautions',
  precautions: 'warnings_precautions',
  storage_conditions: 'storage_conditions',
  usage_instructions: 'how_to_use',
  package_content_details: 'package_content_details',
};

/** Pick between an Arabic value and an English value based on the active language. */
export function pickLocalized<T>(ar: T | null | undefined, en: T | null | undefined): T | undefined {
  const lang = currentDbLang();
  if (lang === 'ar') return (ar ?? en ?? undefined) as T | undefined;
  return (en ?? ar ?? undefined) as T | undefined;
}

/**
 * Full 6-language picker for a catalogue object (medicine/product).
 * Reads the value for the CURRENT app language with English→Arabic fallback.
 */
export function pickDbField<T = string>(obj: any, base: string): T | undefined {
  if (!obj) return undefined;
  const lang = currentDbLang();
  let val: any;
  if (lang === 'ar') {
    val = obj[`${base}_ar`];
  } else if (lang === 'en') {
    val = obj[`${base}_en`];
  } else {
    const key = TRANSLATION_KEY_MAP[base] || base;
    val = obj?.translations?.[lang]?.[key];
  }
  return (val ?? obj[`${base}_en`] ?? obj[`${base}_ar`] ?? undefined) as T | undefined;
}

/** Pick `obj[field_ar]` / `obj[field_en]` based on the active language. */
export function localizedField(obj: any, base: string): any {
  return pickDbField(obj, base);
}
