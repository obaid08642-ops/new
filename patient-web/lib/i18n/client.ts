"use client";

import { useLocale, useMessages, useFormatter } from "next-intl";
import type { SupportedLocale } from "@nabd/i18n";
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPlural,
  formatSelect,
  toLocaleDigits,
  fromLocaleDigits,
  isRTL,
  wrapBidi,
  isolateLatinInRTL,
  getHijriDate,
  getDualDate,
  formatPhoneNumber,
  getPhoneFormatter,
} from "@nabd/i18n";

export function useI18nHelpers() {
  const locale = useLocale() as SupportedLocale;
  const messages = useMessages();
  const formatter = useFormatter();

  return {
    locale,
    messages,
    t: (key: string, values?: Record<string, unknown>) => formatter(key, values),
    tRich: (key: string, values?: Record<string, React.ReactNode>) => formatter(key, values),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) =>
      formatCurrency(locale, value, currency, options),
    formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatDate(locale, date, options),
    formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) =>
      formatRelativeTime(locale, value, unit, options),
    formatPlural: (count: number, forms: Record<string, string>, values?: Record<string, unknown>) =>
      formatPlural(locale, count, forms, values),
    formatSelect: (value: string, choices: Record<string, string>, other: string) =>
      formatSelect(locale, value, choices, other),
    toLocaleDigits: (value: string | number) => toLocaleDigits(value, locale),
    fromLocaleDigits: (value: string) => fromLocaleDigits(value, locale),
    isRTL: () => isRTL(locale),
    wrapBidi: (text: string) => wrapBidi(text, locale),
    isolateLatinInRTL: (text: string) => isolateLatinInRTL(text, locale),
    getHijriDate: (date?: Date) => getHijriDate(date, locale),
    getDualDate: (date?: Date) => getDualDate(date, locale),
    formatPhoneNumber: (phone: string) => formatPhoneNumber(phone, locale),
    parsePhoneNumber: (phone: string) => getPhoneFormatter(locale).parse(phone),
    validatePhoneNumber: (phone: string) => getPhoneFormatter(locale).validate(phone),
    direction: isRTL(locale) ? "rtl" : "ltr",
  };
}

export function useNumberFormat() {
  const locale = useLocale() as SupportedLocale;
  return {
    format: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) =>
      formatCurrency(locale, value, currency, options),
    toLocaleDigits: (value: string | number) => toLocaleDigits(value, locale),
    fromLocaleDigits: (value: string) => fromLocaleDigits(value, locale),
  };
}

export function useDateFormat() {
  const locale = useLocale() as SupportedLocale;
  return {
    format: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatDate(locale, date, options),
    formatRelative: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) =>
      formatRelativeTime(locale, value, unit, options),
    getHijriDate: (date?: Date) => getHijriDate(date, locale),
    getDualDate: (date?: Date) => getDualDate(date, locale),
  };
}

export function usePluralFormat() {
  const locale = useLocale() as SupportedLocale;
  return {
    plural: (count: number, forms: Record<string, string>, values?: Record<string, unknown>) =>
      formatPlural(locale, count, forms, values),
    select: (value: string, choices: Record<string, string>, other: string) =>
      formatSelect(locale, value, choices, other),
  };
}

export function useBidi() {
  const locale = useLocale() as SupportedLocale;
  return {
    isRTL: isRTL(locale),
    direction: isRTL(locale) ? "rtl" : "ltr",
    wrapBidi: (text: string) => wrapBidi(text, locale),
    isolateLatin: (text: string) => isolateLatinInRTL(text, locale),
  };
}

export function usePhoneFormat() {
  const locale = useLocale() as SupportedLocale;
  return {
    format: (phone: string) => formatPhoneNumber(phone, locale),
    parse: (phone: string) => getPhoneFormatter(locale).parse(phone),
    validate: (phone: string) => getPhoneFormatter(locale).validate(phone),
  };
}