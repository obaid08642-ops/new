/**
 * One provider_earning row per (ref_type, ref_id): a completed service is credited once. `creditEarning` checks that with a read before the insert, which two
 * parallel `service.completed` events both pass. The unique partial index below makes the database the judge; the insert's duplicate-key error then means "already credited".
 * The index is built only when no duplicate exists (Mongo would refuse to build it otherwise), and it covers only well-formed provider_earning rows
 * (legacy rows without a string ref_type / ref_id are outside it).
 */
export const EARNING_KEY_INDEX = 'provider_earning_ref_unique';
export const EARNING_KEY_FILTER = { type: 'provider_earning', ref_type: { $type: 'string' }, ref_id: { $type: 'string' } };

type Db = { collection(name: string): any };

/** Counts only (never a ref id or a value): how many (ref_type, ref_id) pairs have more than one provider_earning row, and how many rows are extra. */
export async function countEarningDuplicates(db: Db): Promise<{ groups: number; extra_rows: number }> {
  const rows: Array<{ n: number }> = await db.collection('platformledgerentries').aggregate([
    { $match: EARNING_KEY_FILTER },
    { $group: { _id: { t: '$ref_type', r: '$ref_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ], { allowDiskUse: true }).toArray();
  return { groups: rows.length, extra_rows: rows.reduce((s, r) => s + (r.n - 1), 0) };
}

export async function earningIndexPresent(db: Db): Promise<boolean> {
  try {
    const idx: Array<{ name?: string }> = await db.collection('platformledgerentries').listIndexes().toArray();
    return idx.some((i) => i.name === EARNING_KEY_INDEX);
  } catch { return false; }
}

export type EarningIndexResult = 'created' | 'present' | 'duplicates' | 'failed';

/** Builds the unique index when there is no duplicate; with duplicates it does nothing (and says so), so a deploy can never break on dirty data. */
export async function ensureEarningUniqueIndex(db: Db, warn: (msg: string) => void = () => undefined): Promise<EarningIndexResult> {
  try {
    // the index already exists (every start after the first): nothing to check, and no scan of the ledger
    if (await earningIndexPresent(db)) return 'present';
    const dup = await countEarningDuplicates(db);
    if (dup.groups > 0) {
      warn(`ledger: ${dup.groups} provider_earning (ref_type, ref_id) pairs have ${dup.extra_rows} extra rows: the unique index ${EARNING_KEY_INDEX} was not built; finance resolves them first`);
      return 'duplicates';
    }
    await db.collection('platformledgerentries').createIndex({ ref_type: 1, ref_id: 1 }, { unique: true, name: EARNING_KEY_INDEX, partialFilterExpression: EARNING_KEY_FILTER });
    return 'created';
  } catch (e: any) {
    warn(`ledger: the unique index ${EARNING_KEY_INDEX} could not be built: ${e?.message}`);
    return 'failed';
  }
}
