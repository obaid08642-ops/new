/**
 * Merges the per-region parts (`part-SA-xx.json` + `.report.json`, written by fetch-osm-districts-region.ts) into one raw extract that
 * `validate-districts-extract.ts` reads (`<out>` and `<out>.report.json`). A missing or unreadable part is reported as an error for its
 * region, never skipped silently. Exits 0 even when some regions failed: the failures are in the report and the summary.
 *
 * Run: npx ts-node --transpile-only scripts/geo/merge-districts-parts.ts <dir-with-parts> <out.json>
 */
import * as fs from 'fs';
import * as path from 'path';
import { REGIONS } from './fetch-osm-districts-region';

export function mergeParts(dir: string): { merged: { cities: never[]; districts: unknown[] }; report: Record<string, unknown> } {
  const merged: { cities: never[]; districts: unknown[] } = { cities: [], districts: [] };
  const report: Record<string, unknown> = {};
  const files = fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String) : [];
  for (const { iso } of REGIONS) {
    const part = files.find((f) => path.basename(f) === `part-${iso}.json`);
    if (!part) { report[`region:${iso}`] = { error: 'part missing (the region job did not upload)' }; continue; }
    try {
      merged.districts.push(...(JSON.parse(fs.readFileSync(path.join(dir, part), 'utf8')).districts ?? []));
      const rep = path.join(dir, `${part}.report.json`);
      Object.assign(report, fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : { [`region:${iso}`]: { error: 'report missing' } });
    } catch (e) {
      report[`region:${iso}`] = { error: `unreadable part: ${(e as Error).message}` };
    }
  }
  return { merged, report };
}

if (require.main === module) {
  const [dir, out] = process.argv.slice(2);
  if (!dir || !out) { console.error('usage: merge-districts-parts <dir> <out.json>'); process.exit(2); }
  const { merged, report } = mergeParts(dir);
  fs.writeFileSync(out, JSON.stringify(merged, null, 1));
  fs.writeFileSync(`${out}.report.json`, JSON.stringify(report, null, 1));
  const failed = Object.entries(report).filter(([, v]) => (v as { error?: unknown }).error);
  console.log(JSON.stringify({ districts: merged.districts.length, failed_regions: failed.map(([k]) => k) }));
}
