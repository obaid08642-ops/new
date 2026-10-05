import { IntlMessageFormat } from "intl-messageformat";
import type { SupportedLocale } from "../locales";

const formatterCache = new Map<string, IntlMessageFormat>();

export function getICUFormatter(
  locale: SupportedLocale,
  pattern: string
): IntlMessageFormat {
  const cacheKey = `${locale}:${pattern}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(pattern, locale);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatMessage(
  locale: SupportedLocale,
  pattern: string,
  values: Record<string, unknown>
): string {
  try {
    return String(getICUFormatter(locale, pattern).format(values));
  } catch {
    return pattern;
  }
}

export function formatPlural(
  locale: SupportedLocale,
  count: number,
  forms: Record<string, string>,
  values?: Record<string, unknown>
): string {
  const pattern = `{count, plural, 
    =0 {${forms.zero || forms.other}}
    =1 {${forms.one || forms.other}}
    =2 {${forms.two || forms.other}}
    few {${forms.few || forms.other}}
    many {${forms.many || forms.other}}
    other {${forms.other}}
  }`;
  return formatMessage(locale, pattern, { count, ...values });
}

export function formatSelect(
  locale: SupportedLocale,
  value: string,
  choices: Record<string, string>,
  other: string
): string {
  const options = Object.entries(choices)
    .map(([key, val]) => `${key} {${val}}`)
    .join(" ");
  const pattern = `{value, select, ${options} other {${other}}}`;
  return formatMessage(locale, pattern, { value });
}

export function formatNumber(
  locale: SupportedLocale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  locale: SupportedLocale,
  value: number,
  currency: string = "SAR",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    ...options,
  }).format(value);
}

export function formatDate(
  locale: SupportedLocale,
  date: Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

export function formatRelativeTime(
  locale: SupportedLocale,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions
): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto", ...options }).format(value, unit);
}

export class ICUMessageFormatter {
  private formatters: Map<string, IntlMessageFormat> = new Map();

  format(locale: SupportedLocale, pattern: string, values: Record<string, unknown>): string {
    const key = `${locale}:${pattern}`;
    let formatter = this.formatters.get(key);
    if (!formatter) {
      formatter = new IntlMessageFormat(pattern, locale);
      this.formatters.set(key, formatter);
    }
    try {
      return String(formatter.format(values));
    } catch {
      return pattern;
    }
  }
}