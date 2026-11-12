/**
 * Cloudinary orphan finder, the pure part (owner/lead 2026-11-12: Cloudinary is over its plan and the owner pays nothing new, so unused assets must go).
 * An ORPHAN is an asset under `nabd/` that no live `storage_objects` row points to (the row was deleted, or never written, or its destroy call failed).
 * Nothing here reads or writes anything: the runner (`cloudinary-orphans.ts`) feeds it the asset list and the referenced keys.
 */
export interface CloudinaryAsset { public_id: string; bytes: number; created_at: string; type?: string }
export interface OrphanReport {
  assets: number; bytes: number;
  referenced: number; referencedBytes: number;
  orphans: number; orphanBytes: number;
  /** Orphans younger than the minimum age: an upload may still be writing its row, so they are never listed for deletion. */
  tooYoung: number;
  /** Orphans per folder (`nabd/<a>/<b>`): counts and bytes only, never a name or an id. */
  byFolder: Record<string, { orphans: number; bytes: number }>;
  /** The public ids that would be deleted (what `--apply` takes; never printed by the dry run). */
  deletable: string[];
}

/**
 * The folder of an asset, so the report names no account: `nabd/doctors/original/<owner>` -> `nabd/doctors/original`, `nabd/provider_account/<owner>/<uuid>` -> `nabd/provider_account`.
 * Only the first two segments and a third that is one of the known size folders are kept; anything else (an owner id, a uuid) is dropped.
 */
const SIZE_FOLDERS = new Set(['original', 'large', 'medium', 'small']);
export function folderOf(publicId: string): string {
  const parts = publicId.split('/');
  if (parts.length < 2) return '(root)';
  const keep = parts.slice(0, 2);
  if (parts.length > 3 && SIZE_FOLDERS.has(parts[2])) keep.push(parts[2]);
  return keep.join('/');
}

/** The two spellings a stored key may match an asset under (Cloudinary may drop the extension of an image public id). */
export function keyVariants(key: string): string[] {
  const noExt = key.replace(/\.(webp|jpe?g|png|avif|gif)$/i, '');
  return noExt === key ? [key] : [key, noExt];
}

export function classifyOrphans(assets: CloudinaryAsset[], referencedKeys: Iterable<string>, now: number, minAgeMs: number): OrphanReport {
  const ref = new Set<string>();
  for (const k of referencedKeys) for (const v of keyVariants(String(k))) ref.add(v);
  const rep: OrphanReport = { assets: 0, bytes: 0, referenced: 0, referencedBytes: 0, orphans: 0, orphanBytes: 0, tooYoung: 0, byFolder: {}, deletable: [] };
  for (const a of assets) {
    const bytes = Number(a.bytes) || 0;
    rep.assets += 1; rep.bytes += bytes;
    if (ref.has(a.public_id) || keyVariants(a.public_id).some((v) => ref.has(v))) { rep.referenced += 1; rep.referencedBytes += bytes; continue; }
    rep.orphans += 1; rep.orphanBytes += bytes;
    const f = folderOf(a.public_id);
    rep.byFolder[f] = { orphans: (rep.byFolder[f]?.orphans ?? 0) + 1, bytes: (rep.byFolder[f]?.bytes ?? 0) + bytes };
    const age = now - new Date(a.created_at).getTime();
    if (!(age >= minAgeMs)) { rep.tooYoung += 1; continue; }
    rep.deletable.push(a.public_id);
  }
  return rep;
}

/** The counts-only lines of the dry run (MB with one decimal). No public id, no account id, no URL. */
export function reportLines(r: OrphanReport): string[] {
  const mb = (n: number) => (n / 1048576).toFixed(1);
  const lines = [
    `cloudinary-orphans: ${r.assets} assets under nabd/ (${mb(r.bytes)} MB): ${r.referenced} referenced (${mb(r.referencedBytes)} MB), ${r.orphans} orphans (${mb(r.orphanBytes)} MB)`,
    `cloudinary-orphans: ${r.tooYoung} orphans are younger than the minimum age and are kept; ${r.deletable.length} would be deleted`,
  ];
  for (const [folder, v] of Object.entries(r.byFolder).sort((a, b) => b[1].bytes - a[1].bytes)) lines.push(`cloudinary-orphans: folder ${folder}: ${v.orphans} orphans, ${mb(v.bytes)} MB`);
  return lines;
}
