import { translations } from '../i18n';

/**
 * The accessibility texts of the shared design-system components, from the translation files (`ds.*`), in the app language.
 * Falls back to English, then to the key, so a missing key is visible in tests and never blank. `{n}`-style slots are filled from `vars`.
 */
export function dsText(lang: string, key: string, vars?: Record<string, string | number>): string {
  const table = translations as unknown as Record<string, Record<string, string> | undefined>;
  const text = table[lang]?.[key] ?? table.en?.[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot)) : text;
}
