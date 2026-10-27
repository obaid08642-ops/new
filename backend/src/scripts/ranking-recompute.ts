/**
 * Fills the two fields the pharmacy ordering reads, after #2028/#2032 are deployed: `orders_count` (the recount of delivered orders) and
 * `category_pos` (the round-robin position that makes "All" a mix of every category), by running the SAME ranking recompute as
 * POST /admin/ranking/recompute (ProductRankingService.recomputeAll), inside the backend container, with its own MONGO_URL / DB_NAME / REDIS_URL
 * and no admin token. Run by `tools/ops/tasks/94-ranking-recompute.sh`.
 *   plan  (default)  READ-ONLY: what would change, and how many distinct top-level categories the first 24 of "All" hold now.
 *   apply            recount orders_count, recompute the ranking (scores, category_pos), verify, print the first 24 again.
 * Prints counts only (JSON lines), never a document or a value of the environment.
 */
import mongoose, { Connection } from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';
import { publicMedicineFilter } from '../modules/medicines/public-medicine-filter';
import { recountDeliveredOrders } from '../modules/orders/ordered-count';
import { ProductRankingService, popularPage } from '../modules/product-ranking/product-ranking.service';
import { ProductRankingMetrics, ProductRankingMetricsSchema } from '../schemas/product-ranking-metrics.schema';
import { RedisService } from '../modules/redis/redis.service';

const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));

export interface Recomputer { recomputeAll(): Promise<{ updated: number }> }

/** The distinct top-level categories among the first 24 products of "All" (what a patient sees first), with the stored positions as they are now. */
export async function firstPageCategories(conn: Connection | { collection(n: string): any }, size = 24): Promise<{ of: number; distinct_categories: number }> {
  const col = (conn as any).collection(CATALOG_COLLECTIONS.medicines);
  const rows = await popularPage(col, publicMedicineFilter() as never, 0, size, { _id: 0, category: 1 }, true);
  return { of: rows.length, distinct_categories: new Set(rows.map((r) => r.category).filter(Boolean)).size };
}

async function positions(conn: { collection(n: string): any }) {
  const meds = conn.collection(CATALOG_COLLECTIONS.medicines);
  const withCategory = { category: { $type: 'string' } };
  const [medicines_with_category, missing_category_pos, categories] = await Promise.all([
    meds.countDocuments(withCategory),
    meds.countDocuments({ ...withCategory, category_pos: { $exists: false } }),
    meds.distinct('category', withCategory),
  ]);
  return { medicines_with_category, missing_category_pos, categories: categories.length };
}

export async function plan(conn: Connection | { collection(n: string): any }): Promise<void> {
  const c = conn as any;
  out({ step: 'orders_count', ...(await recountDeliveredOrders(c, false)) });
  out({ step: 'category_pos', ...(await positions(c)) });
  out({ step: 'metrics', rows: await c.collection('product_ranking_metrics').countDocuments({ pharmacy_id: 'global' }) });
  out({ step: 'first_page', when: 'before', ...(await firstPageCategories(c)) });
  out({ step: 'plan', writes: false });
}

/** Returns the exit code: 0 when every product with a category has its position afterwards. */
export async function apply(conn: Connection | { collection(n: string): any }, ranking: Recomputer): Promise<number> {
  const c = conn as any;
  const before = await firstPageCategories(c);
  out({ step: 'first_page', when: 'before', ...before });
  out({ step: 'orders_count', ...(await recountDeliveredOrders(c, true)) });
  const { updated } = await ranking.recomputeAll();
  out({ step: 'recompute', updated });
  const after = await positions(c);
  out({ step: 'category_pos', ...after });
  const page = await firstPageCategories(c);
  out({ step: 'first_page', when: 'after', ...page });
  const ok = after.missing_category_pos === 0;
  out({ step: 'verify', ok });
  return ok ? 0 : 1;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set in this container');
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 2, serverSelectionTimeoutMS: 30_000 }).asPromise();
  const redis = new RedisService();
  try {
    if (!argv.includes('apply')) { await plan(conn); return 0; }
    redis.onModuleInit();
    const metrics = conn.model(ProductRankingMetrics.name, ProductRankingMetricsSchema);
    return await apply(conn, new ProductRankingService(metrics as never, redis, conn));
  } finally {
    await redis.onModuleDestroy().catch(() => undefined);
    await conn.close().catch(() => undefined);
  }
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/(mongodb(\+srv)?|redis(s)?):\/\/\S+/gi, '$1://<hidden>').slice(0, 300)}`); process.exit(1); });
}
