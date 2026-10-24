/**
 * Medicine name translations: the pure rules behind the apply script (issue 1844). Nothing here touches a database.
 *
 *  - Only `translations.<locale>.name` and `translations.<locale>.official_name` are changed.
 *  - A field is changed only when its stored value is empty or still English: equal to the English name, or one of the
 *    English source strings of the translation file. A non-English value is never overwritten.
 *  - The production apply needs the file's SHA-256 as its confirmation, so only the reviewed file can be applied.
 *  - A backup holds the value each changed field had, so a rollback restores exactly those values.
 */
import { createHash } from 'crypto';

/** Locale key in the database (`translations.<key>`) and the column of the translation file. */
export const FILL_LOCALES: ReadonlyArray<{ key: 'ur' | 'hi' | 'bn' | 'tl'; col: 'ur' | 'hi' | 'bn' | 'fil' }> = [
  { key: 'ur', col: 'ur' },
  { key: 'hi', col: 'hi' },
  { key: 'bn', col: 'bn' },
  { key: 'tl', col: 'fil' },
];

export type Translation = { ur: string; hi: string; bn: string; fil: string };

export function csvSha256(csvText: string): string {
  return createHash('sha256').update(csvText, 'utf8').digest('hex');
}

/** A minimal CSV reader for the quoted fields of the translation file. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

export function loadTranslations(csvText: string): Map<string, Translation> {
  const [header, ...rows] = parseCsv(csvText);
  const at = (name: string) => header.indexOf(name);
  const map = new Map<string, Translation>();
  for (const r of rows) {
    const source = r[at('source')]?.trim();
    if (!source) continue;
    map.set(source, { ur: r[at('ur')] || '', hi: r[at('hi')] || '', bn: r[at('bn')] || '', fil: r[at('fil')] || '' });
  }
  return map;
}

/** Empty, the English name, or one of the English source strings: the only values a translation may replace. */
export function isStillEnglish(value: unknown, nameEn: string, english: Map<string, Translation>): boolean {
  const v = String(value ?? '').trim();
  if (!v) return true;
  if (v === String(nameEn ?? '').trim()) return true;
  return english.has(v);
}

export type FillChange = { id: string; field: 'name' | 'official_name'; locale: string; path: string; before: string | null; after: string };

/** The changes for the medicine rows. Each change is one field; a non-English field is never in the plan. */
export function planFill(rows: any[], map: Map<string, Translation>): FillChange[] {
  const changes: FillChange[] = [];
  for (const r of rows) {
    if (r.is_deleted === true) continue;
    const nameEn = String(r.name_en || '');
    for (const loc of FILL_LOCALES) {
      for (const field of ['name', 'official_name'] as const) {
        const current = r.translations?.[loc.key]?.[field];
        if (!isStillEnglish(current, nameEn, map)) continue;
        // The source of the translation: the stored English text, or the English name when nothing is stored.
        const source = String(current ?? '').trim() || nameEn.trim();
        const t = map.get(source) || map.get(nameEn.trim());
        const after = t?.[loc.col] || '';
        if (!after.trim()) continue;
        if (after.trim() === String(current ?? '').trim()) continue;
        changes.push({
          id: String(r.id),
          field,
          locale: loc.key,
          path: `translations.${loc.key}.${field}`,
          before: current === undefined || current === null ? null : String(current),
          after,
        });
      }
    }
  }
  return changes;
}

export type Backup = { created_at: string; csv_sha256: string; db: string; changes: FillChange[] };

export function buildBackup(changes: FillChange[], csvSha: string, db: string, at: Date = new Date()): Backup {
  return { created_at: at.toISOString(), csv_sha256: csvSha, db, changes };
}

/** The production apply needs the reviewed file's hash, copied from the dry run. */
export function checkConfirmation(csvText: string, provided: string | undefined): boolean {
  return typeof provided === 'string' && provided.length > 0 && provided === csvSha256(csvText);
}
