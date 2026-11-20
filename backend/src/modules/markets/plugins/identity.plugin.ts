/** Per-market identity document rules (patient national ID / residence number). */
export interface IdentityPlugin {
  /** Machine id of the document type, e.g. 'sa-national-id-or-iqama'. */
  readonly type_id: string;
  /** Returns the normalised number, or null when it is not valid for this market. */
  normalise(raw: unknown): string | null;
  /** Shows only the last 3 characters. */
  mask(id: string | null | undefined): string | null;
}

/** Arabic-Indic and Persian digits become ASCII; spaces and dashes go. */
function asciiDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s-]/g, '');
}

export function maskLast3(id: string | null | undefined): string | null {
  const s = typeof id === 'string' ? id.trim() : '';
  if (!s) return null;
  return s.length <= 3 ? '*'.repeat(s.length) : '*'.repeat(s.length - 3) + s.slice(-3);
}

/** Saudi national ID (starts 1) or iqama (starts 2): 10 digits and the Luhn-style check digit. Same rule as before, moved here unchanged. */
export const saIdentityPlugin: IdentityPlugin = {
  type_id: 'sa-national-id-or-iqama',
  normalise(raw: unknown): string | null {
    const v = typeof raw === 'string' ? asciiDigits(raw.trim()) : '';
    if (!/^[12]\d{9}$/.test(v)) return null;
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const d = Number(v[i]);
      if (i % 2 === 0) { const t = d * 2; sum += t > 9 ? t - 9 : t; } else sum += d;
    }
    return sum % 10 === 0 ? v : null;
  },
  mask: maskLast3,
};
