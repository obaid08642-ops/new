/**
 * Fills the gaps of the product content by TRANSLATING the text that exists (owner complaint 2026-10-26; never invented content).
 * Same shape as classify-catalogue-batch.ts: separate commands, JSONL in / JSONL out, resumable, nothing secret stored.
 *
 *   gaps  --out requests.jsonl [--targets ar,en,ur,hi,bn,fil] [--limit 5000]
 *         DRY RUN. Reads the published products (MONGO_URL / DB_NAME), counts the missing texts per target and field, the texts in the
 *         WRONG column (an Arabic text in the English column) per field and pair, and prints the token count and the price at the configured
 *         model. A wrong-column text is FIXED, not skipped (owner 2026-10-27): it is a "move" (the right column is empty: the text moves there),
 *         a "clear" (the right column already has its text: only the wrong one is emptied) or a "swap". The missing texts it leaves behind are
 *         planned from the corrected product. Writes the requests and, next to them, `<out>.moves.json` (the moves, read by `plan`).
 *   run   --requests requests.jsonl --out responses.jsonl [--rpm 60] [--max N]
 *         Calls the model. Resumable: request ids already in --out are skipped. Needs an AI provider key in the environment (any provider of the
 *         gateway chain: GEMINI_API_KEY, GROQ_API_KEY, ... OPENCODE_API_KEY; they are tried in order); without one it says so and stops. Model: TRANSLATE_MODEL (default as the classify job).
 *   plan  --requests requests.jsonl --responses responses.jsonl --out translations.json
 *         Checks every answer (same numbers, right script, sane length, no markup) and writes the reviewed file that
 *         `catalogue-apply plan --product-translations=<file>` reads. Rejected answers are counted by reason and left out.
 *
 *   npx ts-node --transpile-only src/scripts/translate-product-content.ts <step> ...
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import { sha256 } from '../modules/catalogs/catalogue-apply.core';
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';
import { publicMedicineFilter } from '../modules/medicines/public-medicine-filter';
import { TARGET_ORDER, buildRequests, checkTranslation, findGaps, parseAnswers, type Gap, type MoveItem, type Rejection, type TranslateRequest, type TranslationFile, type TranslationItem } from '../modules/medicines/content-translation';
import type { ContentLocale } from '../modules/medicines/med-i18n';
import { DEFAULT_MODEL, PRICES, approxTokens } from './classify-catalogue-batch';
import { providerCallersFromEnv, providerVariableNames, RegistryRecord } from '../modules/ai/env-chain';
import { runParallel, errorClass, ParallelProvider, ProviderLimits } from './parallel-runner';

const arg = (argv: string[], name: string): string | undefined => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
export const PROVIDER_VARIABLES: readonly string[] = providerVariableNames();

export interface GapEstimate {
  texts: number; requests: number; total_input_tokens: number; total_output_tokens: number; model: string;
  usd_standard: number; usd_batch_api: number; price_source: string;
}

/** Output is about as long as the source text (a translation), plus the JSON frame of each item. */
export function estimateRequests(reqs: TranslateRequest[], model = DEFAULT_MODEL): GapEstimate {
  const p = PRICES[model];
  const input = reqs.reduce((n, r) => n + approxTokens(r.prompt), 0);
  const output = reqs.reduce((n, r) => n + r.items.reduce((m, i) => m + Math.ceil(approxTokens(i.text) * 1.25) + 8, 0), 0);
  return {
    texts: reqs.reduce((n, r) => n + r.items.length, 0), requests: reqs.length, total_input_tokens: input, total_output_tokens: output, model,
    usd_standard: Math.round(((input * p.input + output * p.output) / 1e6) * 100) / 100,
    usd_batch_api: Math.round(((input * p.batchInput + output * p.batchOutput) / 1e6) * 100) / 100,
    price_source: p.source,
  };
}

/**
 * One entry per provider whose key is set, each with its own limits: the catalogue's requests/minute, requests/day and tokens/day, of which
 * a run uses TRANSLATE_DAILY_SHARE (default 0.6) because the same keys serve the live assistant. `TRANSLATE_LIMITS` (JSON, by provider name,
 * e.g. {"groq":{"rpm":10,"lanes":2}}) overrides a number; `--rpm` caps every provider.
 */
export function translateProviders(env: NodeJS.ProcessEnv, rpmCap?: number, registry: RegistryRecord[] = []): ParallelProvider[] {
  const share = Math.min(1, Math.max(0.05, Number(env.TRANSLATE_DAILY_SHARE) || 0.6));
  const over: Record<string, Partial<ProviderLimits>> = env.TRANSLATE_LIMITS ? JSON.parse(env.TRANSLATE_LIMITS) : {};
  return providerCallersFromEnv({ ...env, CLASSIFY_MODEL: env.TRANSLATE_MODEL || env.CLASSIFY_MODEL }, { registry, model: env.TRANSLATE_MODEL || env.CLASSIFY_MODEL, timeoutMs: Number(env.TRANSLATE_TIMEOUT_MS) || 180_000 }).map(({ provider, call }) => {
    const base: ProviderLimits = {
      rpm: provider.requests_per_minute || 10,
      rpd: provider.requests_per_day ? Math.floor(provider.requests_per_day * share) : 0,
      tokens_per_day: provider.tokens_per_day ? Math.floor(provider.tokens_per_day * share) : 0,
      lanes: 3,
    };
    const limits = { ...base, ...(over[provider.key] ?? {}) };
    if (rpmCap) limits.rpm = Math.min(limits.rpm, rpmCap);
    return { name: provider.key, call, limits };
  });
}

/**
 * Why an answer is not worth writing (a fixed word), or null when at least one of its items passes the same checks `plan` applies. An answer where
 * nothing passes would only be asked about again at the next gaps run, so the run asks another provider instead of recording it as done.
 */
export function rejectionOf(req: TranslateRequest | undefined, text: string): string | null {
  if (!req) return null;
  const answers = parseAnswers(text);
  if (!answers.length) return 'no_json';
  const byIndex = new Map(answers.map((a) => [a.i, a.t]));
  let first: string | null = null;
  for (const it of req.items) {
    if (!byIndex.has(it.i)) { first ??= 'no_answer'; continue; }
    const why = checkTranslation(it.text, byIndex.get(it.i) as string | null, req.target);
    if (!why) return null;
    first ??= why;
  }
  return first ?? 'no_answer';
}

/** The requests still to send: those without an answer yet, at most `max` (a bounded batch per run keeps a free-tier day within its limit). */
export function pendingRequests<T extends { id: string }>(reqs: T[], done: Set<string>, max: number = Infinity): T[] {
  return reqs.filter((r) => !done.has(r.id)).slice(0, Math.max(0, max));
}

export interface PlanOutcome { file: TranslationFile; accepted: number; rejected: Record<Rejection | 'no_answer', number>; by_target: Record<string, number> }

/** Answers → the reviewed file: only the ones that pass `checkTranslation`. */
export function planFromResponses(reqs: TranslateRequest[], responses: Map<string, string>, model: string, generatedAt: string): PlanOutcome {
  const items: TranslationItem[] = [];
  const rejected: PlanOutcome['rejected'] = { empty: 0, numbers_differ: 0, wrong_script: 0, length: 0, format: 0, no_answer: 0 };
  const by_target: Record<string, number> = {};
  for (const req of reqs) {
    const raw = responses.get(req.id);
    const answers = raw === undefined ? [] : parseAnswers(raw);
    const byIndex = new Map(answers.map((a) => [a.i, a.t]));
    for (const it of req.items) {
      if (!byIndex.has(it.i)) { rejected.no_answer += 1; continue; }
      const out = byIndex.get(it.i) as string | null;
      const why = checkTranslation(it.text, out, req.target);
      if (why) { rejected[why] += 1; continue; }
      items.push({ id: it.id, field: it.field, target: req.target, source: req.source, text: (out as string).trim(), source_sha: sha256(it.text) });
      by_target[req.target] = (by_target[req.target] ?? 0) + 1;
    }
  }
  items.sort((a, b) => TARGET_ORDER.indexOf(a.target) - TARGET_ORDER.indexOf(b.target) || a.id.localeCompare(b.id) || a.field.localeCompare(b.field));
  return { file: { version: 1, model, generated_at: generatedAt, items }, accepted: items.length, rejected, by_target };
}

export interface MoveSummary { total: number; by_kind: Record<string, number>; per_pair: Record<string, Record<string, number>> }

/** Counts of the wrong-column texts: by kind, and per language pair (`wrong>right`) and field. */
export function summarizeMoves(moves: MoveItem[]): MoveSummary {
  const out: MoveSummary = { total: moves.length, by_kind: {}, per_pair: {} };
  for (const m of moves) {
    out.by_kind[m.kind] = (out.by_kind[m.kind] ?? 0) + 1;
    const pair = (out.per_pair[`${m.wrong}>${m.right}`] ??= {});
    pair[m.field] = (pair[m.field] ?? 0) + 1;
  }
  return out;
}

const readJsonl = <T>(file: string): T[] => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T) : []);
const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));

/**
 * The live gateway's provider records (model id, base URL, enabled): the callers must go where the gateway goes, not where the built-in defaults say
 * (a provider retires a model and an admin changes the record; the defaults then answer 404 although the gateway works). No MONGO_URL or an unreadable
 * collection gives [] and a line on stderr: the built-in defaults are used.
 */
export async function loadRegistry(env: NodeJS.ProcessEnv): Promise<RegistryRecord[]> {
  const uri = env.MONGO_URL;
  if (!uri) { process.stderr.write('status: translate-content: registry: no MONGO_URL, built-in models are used\n'); return []; }
  let conn: mongoose.Connection | null = null;
  try {
    conn = await mongoose.createConnection(uri, { dbName: env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 1 }).asPromise();
    const rows = await conn.db!.collection('ai_providers').find({}, { projection: { _id: 0, key: 1, model: 1, base_url: 1, enabled: 1 } }).toArray();
    return rows.filter((r) => typeof r.key === 'string').map((r) => ({ key: r.key as string, model: typeof r.model === 'string' ? r.model : undefined, base_url: typeof r.base_url === 'string' ? r.base_url : undefined, enabled: r.enabled === undefined ? undefined : r.enabled !== false }));
  } catch {
    process.stderr.write('status: translate-content: registry: unreadable, built-in models are used\n');
    return [];
  } finally {
    await conn?.close().catch(() => undefined);
  }
}

export async function main(argv: string[]): Promise<number> {
  const step = argv[0];
  if (step === 'probe') {
    // One tiny request per provider that has a key, side by side: prints provider, model, status (ok|failed) and class (ok | http_404 | auth | timeout ...). Nothing else.
    const calls = providerCallersFromEnv(process.env, { registry: await loadRegistry(process.env), timeoutMs: Number(process.env.TRANSLATE_PROBE_TIMEOUT_MS) || 30_000 });
    let failed = 0;
    await Promise.all(calls.map(async ({ provider, call }) => {
      let cls = 'ok';
      try { await call('Reply with the single word OK.'); } catch (e) { cls = errorClass(e); failed += 1; }
      out({ provider: provider.key, model: provider.model, status: cls === 'ok' ? 'ok' : 'failed', class: cls });
    }));
    return failed === calls.length ? 1 : 0;
  }
  if (step === 'gaps') {
    const uri = process.env.MONGO_URL;
    if (!uri) throw new Error('MONGO_URL is not set');
    const outFile = arg(argv, 'out'); if (!outFile) throw new Error('--out=<requests.jsonl> is required');
    const targets = new Set((arg(argv, 'targets') || TARGET_ORDER.join(',')).split(',') as ContentLocale[]);
    const limit = Number(arg(argv, 'limit')) || Infinity;
    const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 1 }).asPromise();
    const gaps: Gap[] = []; let mislabelled = 0; let products = 0;
    const moves: MoveItem[] = [];
    try {
      for await (const raw of conn.db!.collection(CATALOG_COLLECTIONS.medicines).find(publicMedicineFilter() as never, { projection: { _id: 0 } })) {
        products += 1;
        const r = findGaps(raw);
        mislabelled += r.mislabelled;
        moves.push(...r.moves);
        for (const g of r.gaps) if (targets.has(g.target) && gaps.length < limit) gaps.push(g);
      }
    } finally { await conn.close().catch(() => undefined); }
    const reqs = buildRequests(gaps);
    fs.writeFileSync(outFile, reqs.map((r) => JSON.stringify(r)).join('\n') + (reqs.length ? '\n' : ''));
    const per: Record<string, number> = {};
    for (const g of gaps) per[`${g.source}>${g.target}`] = (per[`${g.source}>${g.target}`] ?? 0) + 1;
    const movesFile = `${outFile}.moves.json`;
    fs.writeFileSync(movesFile, JSON.stringify({ version: 1, generated_at: new Date().toISOString(), moves }, null, 1));
    out({
      step, dry_run: true, published_products: products, missing_texts: gaps.length, per_pair: per, requests_file: outFile, ...estimateRequests(reqs, process.env.TRANSLATE_MODEL || DEFAULT_MODEL),
      text_in_wrong_column: summarizeMoves(moves), text_in_wrong_column_still_unresolved: mislabelled, moves_file: movesFile,
    });
    return 0;
  }
  if (step === 'run') {
    const present = PROVIDER_VARIABLES.filter((v) => !!process.env[v]);
    if (!present.length) { out({ step, ok: false, error: `no AI provider variable is set (${PROVIDER_VARIABLES.join(', ')}): nothing was sent. The sections stay marked with their language (the page rule).` }); return 2; }
    const requests = arg(argv, 'requests'); const outFile = arg(argv, 'out');
    if (!requests || !outFile) throw new Error('--requests and --out are required');
    const reqs = readJsonl<TranslateRequest>(requests);
    const done = new Set(readJsonl<{ id: string }>(outFile).map((r) => r.id));
    const batch = pendingRequests(reqs, done, Number(arg(argv, 'max')) || Infinity);
    const providers = translateProviders(process.env, Number(arg(argv, 'rpm')) || undefined, await loadRegistry(process.env));
    const t0 = Date.now();
    const byId = new Map(reqs.map((r) => [r.id, r]));
    const statsFile = process.env.TRANSLATE_STATS_FILE || path.join(path.dirname(outFile), 'stats.json');
    const res = await runParallel(batch.map((r) => ({ id: r.id, prompt: r.prompt })), providers, {
      done, write: (l) => fs.appendFileSync(outFile, `${l}\n`), sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: Date.now, log: (l) => process.stderr.write(`${l}\n`),
    }, {
      tokensOf: approxTokens,
      validate: (id, text) => rejectionOf(byId.get(id), text),
      // counts only (no message, no prompt, no key); written whole, then renamed, so a reader never sees half a file
      onSnapshot: (snap) => {
        const body = JSON.stringify({ ...snap, answered_total: done.size, requests_total: reqs.length, remaining_total: reqs.length - done.size }, null, 1);
        fs.writeFileSync(`${statsFile}.tmp`, body); fs.renameSync(`${statsFile}.tmp`, statsFile);
      },
    });
    out({ step, sent: res.sent, skipped: res.skipped, failed: res.failed, providers: res.providers, minutes: Math.round((Date.now() - t0) / 600) / 100, batch: batch.length, remaining: reqs.length - done.size });
    return res.failed ? 1 : 0;
  }
  if (step === 'plan') {
    const requests = arg(argv, 'requests'); const responses = arg(argv, 'responses'); const outFile = arg(argv, 'out');
    if (!requests || !responses || !outFile) throw new Error('--requests, --responses and --out are required');
    const model = process.env.TRANSLATE_MODEL || DEFAULT_MODEL;
    const map = new Map(readJsonl<{ id: string; text: string }>(responses).map((r) => [r.id, r.text]));
    const plan = planFromResponses(readJsonl<TranslateRequest>(requests), map, model, new Date().toISOString());
    const movesPath = arg(argv, 'moves') ?? `${requests}.moves.json`;
    const moves: MoveItem[] = fs.existsSync(movesPath) ? ((JSON.parse(fs.readFileSync(movesPath, 'utf8')) as { moves?: MoveItem[] }).moves ?? []) : [];
    if (moves.length) plan.file.moves = moves;
    fs.writeFileSync(outFile, JSON.stringify(plan.file, null, 1));
    out({ step, moves: summarizeMoves(moves), accepted: plan.accepted, rejected: plan.rejected, by_target: plan.by_target, file: outFile, file_sha256: sha256(fs.readFileSync(outFile, 'utf8')) });
    return 0;
  }
  throw new Error('usage: translate-product-content <gaps|run|plan>');
}

if (require.main === module) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://<hidden>').slice(0, 300)}`); process.exit(1); });
}
