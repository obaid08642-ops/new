import type { SupportedLocale } from "../locales";

const DIGIT_MAPS: Record<string, string[]> = {
  latn: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  arab: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
  arabext: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  beng: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
  deva: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
};

const REVERSE_DIGIT_MAPS: Record<string, Record<string, string>> = {};

Object.entries(DIGIT_MAPS).forEach(([style, digits]) => {
  REVERSE_DIGIT_MAPS[style] = {};
  digits.forEach((digit, i) => {
    REVERSE_DIGIT_MAPS[style][digit] = String(i);
  });
});

export function getDigitStyle(locale: SupportedLocale): keyof typeof DIGIT_MAPS {
  const styles: Record<SupportedLocale, keyof typeof DIGIT_MAPS> = {
    ar: "arab",
    ur: "arabext",
    hi: "deva",
    bn: "beng",
    en: "latn",
    fil: "latn",
  };
  return styles[locale];
}

export function toLocaleDigits(value: string | number, locale: SupportedLocale): string {
  const style = getDigitStyle(locale);
  if (style === "latn") return String(value);
  const digits = DIGIT_MAPS[style];
  return String(value).replace(/[0-9]/g, (d) => digits[parseInt(d, 10)]);
}

export function fromLocaleDigits(value: string, locale: SupportedLocale): string {
  const style = getDigitStyle(locale);
  if (style === "latn") return value;
  const map = REVERSE_DIGIT_MAPS[style];
  return value.replace(new RegExp(`[${Object.keys(map).join("")}]`, "g"), (d) => map[d] || d);
}

export function isRTL(locale: SupportedLocale): boolean {
  return locale === "ar" || locale === "ur";
}

export function wrapBidi(text: string, locale: SupportedLocale): string {
  if (!isRTL(locale)) return text;
  return `\u202B${text}\u202C`;
}

export function isolateLatinInRTL(text: string, locale: SupportedLocale): string {
  if (!isRTL(locale)) return text;
  return text.replace(/[A-Za-z0-9]+/g, (match) => `\u2068${match}\u2069`);
}

export function getHijriDate(date: Date = new Date(), locale: SupportedLocale = "ar"): string {
  try {
    return new Intl.DateTimeFormat(`${locale}-${locale === "ar" ? "SA" : "PK"}-u-ca-islamic`, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
}

export function getGregorianDate(date: Date = new Date(), locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getDualDate(date: Date = new Date(), locale: SupportedLocale): string {
  const gregorian = getGregorianDate(date, locale);
  if (locale === "ar" || locale === "ur") {
    const hijri = getHijriDate(date, locale);
    return `${gregorian} / ${hijri}`;
  }
  return gregorian;
}

const PHONE_PATTERNS: Record<SupportedLocale, { pattern: RegExp; format: string }> = {
  ar: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
  en: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
  hi: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
  ur: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
  fil: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
  bn: { pattern: /^(\+966|00966|0)?(5\d{8})$/, format: "+966 $1" },
};

export function getPhoneFormatter(locale: SupportedLocale) {
  const { pattern, format } = PHONE_PATTERNS[locale];
  return {
    parse: (phone: string) => {
      const match = phone.match(pattern);
      return match ? match[2] : phone;
    },
    format: (phone: string) => {
      const parsed = phone.replace(/\D/g, "");
      if (parsed.startsWith("966")) {
        return `+966 ${parsed.slice(3)}`;
      }
      if (parsed.startsWith("0")) {
        return `+966 ${parsed.slice(1)}`;
      }
      return `+966 ${parsed}`;
    },
    validate: (phone: string) => pattern.test(phone),
  };
}

export function formatPhoneNumber(phone: string, locale: SupportedLocale): string {
  return getPhoneFormatter(locale).format(phone);
}

export function parsePhoneNumber(phone: string, locale: SupportedLocale): string {
  return getPhoneFormatter(locale).parse(phone);
}

export function validatePhoneNumber(phone: string, locale: SupportedLocale): boolean {
  return getPhoneFormatter(locale).validate(phone);
}