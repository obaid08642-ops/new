// Add-card helpers shared by the screen and its tests (the web has the same rules in patient-web/lib/insurance).

/** The Council of Health Insurance's own beneficiary inquiry page, as the backend's /config sends it (`links.chi_inquiry`). Only an https chi.gov.sa address is accepted. */
export function chiInquiryUrl(config: unknown): string | null {
  const raw = (config as { links?: { chi_inquiry?: unknown } } | null)?.links?.chi_inquiry;
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname === 'chi.gov.sa' || url.hostname.endsWith('.chi.gov.sa')) ? url.toString() : null;
  } catch {
    return null;
  }
}

const fold = (value: string) => value.normalize('NFKC').toLocaleLowerCase();

/** The insurers matching what was typed (any part of the Arabic or English name or the code); all of them while the box is empty. */
export function filterInsurers<T extends { code?: string; name_ar?: string; name_en?: string }>(companies: T[], query: string): T[] {
  const needle = fold(query.trim());
  if (!needle) return companies;
  return companies.filter((c) => [c.name_ar, c.name_en, c.code].some((part) => typeof part === 'string' && fold(part).includes(needle)));
}

export interface InsurerClass { code: string; name_ar?: string; name_en?: string; copayPercent?: number; copayCapSar?: number }

const figure = (value: unknown, max: number): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined);

/** GET /insurance/companies/:id/networks → the insurer's classes, with the catalogue's copay figures when they are in range. */
export function parseInsurerClasses(rows: unknown): InsurerClass[] {
  const list = Array.isArray(rows) ? rows : [];
  return list.flatMap((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const code = typeof r.code === 'string' && r.code ? r.code : typeof r.id === 'string' ? r.id : '';
    if (!code) return [];
    const copayPercent = figure(r.copay_percent, 100);
    const copayCapSar = figure(r.copay_cap_sar, 1_000_000);
    return [{
      code,
      name_ar: typeof r.name_ar === 'string' ? r.name_ar : undefined,
      name_en: typeof r.name_en === 'string' ? r.name_en : undefined,
      ...(copayPercent !== undefined ? { copayPercent } : {}),
      ...(copayCapSar !== undefined ? { copayCapSar } : {}),
    }];
  });
}

/** What choosing a class puts in the two copay boxes: the catalogue's figures when it has them, else what the patient already typed. Both stay editable. */
export function figuresForClass(item: { copayPercent?: number; copayCapSar?: number } | null, current: { percent: string; cap: string }): { percent: string; cap: string } {
  if (!item) return current;
  return {
    percent: item.copayPercent !== undefined ? String(item.copayPercent) : current.percent,
    cap: item.copayCapSar !== undefined ? String(item.copayCapSar) : current.cap,
  };
}
