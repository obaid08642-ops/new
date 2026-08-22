/**
 * Deterministic slug generation utilities.
 *
 * Slug format:  <transliterated-name>-<id-prefix>
 *   e.g.        panadol-extra-500mg-a1b2c3
 *
 * Properties:
 *  - The trailing 6-char id prefix lets us deterministically reverse a slug
 *    back to the source document without storing the slug anywhere.
 *  - Arabic / unicode characters are transliterated to ASCII where possible.
 */

/** Transliterate Arabic letters to a rough ASCII equivalent. */
const AR_MAP: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
  ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
  ي: 'y', ى: 'a', ئ: 'i', ء: '', ؤ: 'u', ة: 'a', ـ: '-',
};

export function slugify(input: string, maxLen = 60): string {
  if (!input) return 'item';
  // Transliterate Arabic
  let out = '';
  for (const ch of input.toLowerCase()) {
    if (AR_MAP[ch] !== undefined) out += AR_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  // Collapse multiple dashes, trim, limit length
  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxLen);
  return out || 'item';
}

/** Build a sluggable URL fragment combining a human name and a stable id. */
export function buildSlug(name: string, id: string): string {
  const base = slugify(name);
  const sfx = (id || '').replace(/-/g, '').slice(0, 6).toLowerCase();
  return `${base}-${sfx}`;
}

/** Extract the id-prefix from a slug for reverse lookup. */
export function parseSlugSuffix(slug: string): string | null {
  if (!slug) return null;
  const m = slug.match(/-([a-f0-9]{6})$/i);
  return m ? m[1].toLowerCase() : null;
}
