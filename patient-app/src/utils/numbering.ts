/**
 * One numbering system per language: Latin digits everywhere except Bengali, whose own digits are used for dates and times as well as
 * counts and prices (formatNumber in ScreenKit), so a screen never mixes the two. Takes a language ("bn") or a locale tag ("bn-BD-u-ca-gregory").
 */
export function numberingFor(langOrLocale?: string): 'latn' | 'beng' {
  return /^bn(\b|-|_)/i.test(langOrLocale || '') ? 'beng' : 'latn';
}
