import type { Connection } from 'mongoose';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { PUBLIC_CATALOG_LOCALES, missingPublicMedicineTranslations, productLocaleToDb } from '../medicines/med-i18n';

/**
 * SEO report for the medicine catalogue (owner, 2026-10-12): how many medicines are approved for
 * publication and how many are missing a translation in a public locale. It only counts what is
 * in the database; it never fills a gap. Missing medical content and translations are listed by
 * medicine id for the medical/translation team, never generated.
 *
 * "Approved for publication" = the same filter the public product pages use:
 *   is_deleted != true, public_eligibility = true, medical_review_status = 'approved'.
 * "Indexable" adds indexing_eligibility = true (sitemaps, IndexNow, llms.txt).
 */
export type PublicLocale = (typeof PUBLIC_CATALOG_LOCALES)[number];

export interface MedicineReport {
  generated_at: string;
  total: number;
  deleted: number;
  public_eligibility: number;
  medical_review_approved: number;
  approved_for_publication: number;
  indexable: number;
  by_review_status: Record<string, number>;
  /** Among the medicines approved for publication. */
  translations: {
    complete_in_all_locales: number;
    missing_in_any_locale: number;
    per_locale: Record<PublicLocale, {
      missing_any: number;
      missing_name: number;
      missing_slug: number;
      missing_fields: Record<string, number>;
      sample_ids: string[];
    }>;
  };
}

const SAMPLE = 50;

/** One medicine's gaps per public locale (name and the conditional fields, plus the localized URL slug). */
export function medicineGapsByLocale(m: Record<string, any>): Record<PublicLocale, string[]> {
  const out = Object.fromEntries(PUBLIC_CATALOG_LOCALES.map((l) => [l, [] as string[]])) as Record<PublicLocale, string[]>;
  for (const gap of missingPublicMedicineTranslations(m)) {
    const [locale, field] = gap.split('.');
    if ((PUBLIC_CATALOG_LOCALES as readonly string[]).includes(locale)) out[locale as PublicLocale].push(field);
  }
  // The localized slug is what /{locale}/p/{slug} resolves; without it the page falls back to the shared slug.
  for (const l of PUBLIC_CATALOG_LOCALES) {
    if (!String(m?.translations?.[productLocaleToDb(l)]?.slug || '').trim()) out[l].push('slug');
  }
  return out;
}

export async function buildMedicineReport(conn: Connection): Promise<MedicineReport> {
  const col = conn.collection(CATALOG_COLLECTIONS.medicines);
  const notDeleted = { is_deleted: { $ne: true } };
  const publishable = { ...notDeleted, public_eligibility: true, medical_review_status: 'approved' };
  const [total, deleted, eligible, approved, approvedForPublication, indexable, statuses] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ is_deleted: true }),
    col.countDocuments({ ...notDeleted, public_eligibility: true }),
    col.countDocuments({ ...notDeleted, medical_review_status: 'approved' }),
    col.countDocuments(publishable),
    col.countDocuments({ ...publishable, indexing_eligibility: true }),
    col.aggregate([{ $match: notDeleted }, { $group: { _id: '$medical_review_status', n: { $sum: 1 } } }]).toArray(),
  ]);

  const perLocale = Object.fromEntries(PUBLIC_CATALOG_LOCALES.map((l) => [l, {
    missing_any: 0, missing_name: 0, missing_slug: 0, missing_fields: {} as Record<string, number>, sample_ids: [] as string[],
  }])) as MedicineReport['translations']['per_locale'];
  let complete = 0;
  let incomplete = 0;

  const projection: Record<string, 1 | 0> = {
    _id: 0, id: 1, name_ar: 1, name_en: 1, category: 1, active_ingredient: 1, form: 1, strength: 1,
  };
  for (const l of PUBLIC_CATALOG_LOCALES) projection[`translations.${productLocaleToDb(l)}`] = 1;
  const cursor = col.find(publishable, { projection }).sort({ id: 1 });
  for await (const m of cursor) {
    const gaps = medicineGapsByLocale(m);
    let any = false;
    for (const l of PUBLIC_CATALOG_LOCALES) {
      const g = gaps[l];
      if (!g.length) continue;
      any = true;
      const row = perLocale[l];
      row.missing_any++;
      if (g.includes('name')) row.missing_name++;
      if (g.includes('slug')) row.missing_slug++;
      for (const f of g) if (f !== 'name' && f !== 'slug') row.missing_fields[f] = (row.missing_fields[f] || 0) + 1;
      if (row.sample_ids.length < SAMPLE && m.id) row.sample_ids.push(String(m.id));
    }
    if (any) incomplete++; else complete++;
  }

  return {
    generated_at: new Date().toISOString(),
    total,
    deleted,
    public_eligibility: eligible,
    medical_review_approved: approved,
    approved_for_publication: approvedForPublication,
    indexable,
    by_review_status: Object.fromEntries(statuses.map((s: any) => [String(s._id ?? 'unset'), s.n])),
    translations: { complete_in_all_locales: complete, missing_in_any_locale: incomplete, per_locale: perLocale },
  };
}

/** Markdown rendering for the PR / ops channel (numbers only, ids in the JSON). */
export function medicineReportMarkdown(r: MedicineReport): string {
  const lines = [
    `# Medicine SEO report (${r.generated_at})`,
    '',
    '| Count | Medicines |',
    '|---|---:|',
    `| In the catalogue (all) | ${r.total} |`,
    `| Deleted | ${r.deleted} |`,
    `| public_eligibility = true | ${r.public_eligibility} |`,
    `| medical_review_status = approved | ${r.medical_review_approved} |`,
    `| **Approved for publication (both)** | **${r.approved_for_publication}** |`,
    `| Indexable (also indexing_eligibility) | ${r.indexable} |`,
    '',
    `Review status: ${Object.entries(r.by_review_status).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`,
    '',
    `Of the ${r.approved_for_publication} approved: ${r.translations.complete_in_all_locales} complete in all six locales, ${r.translations.missing_in_any_locale} missing a translation in at least one.`,
    '',
    '| Locale | Missing anything | Name | URL slug | Other fields |',
    '|---|---:|---:|---:|---|',
    ...PUBLIC_CATALOG_LOCALES.map((l) => {
      const x = r.translations.per_locale[l];
      const other = Object.entries(x.missing_fields).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
      return `| ${l} | ${x.missing_any} | ${x.missing_name} | ${x.missing_slug} | ${other} |`;
    }),
    '',
    'Nothing is generated to fill a gap: the medical and translation teams fill them in the catalogue; sample ids per locale are in the JSON output.',
  ];
  return lines.join('\n');
}
