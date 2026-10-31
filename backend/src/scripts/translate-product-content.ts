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
 *   plan  --requests requests.jsonl --responses responses.jsonl --out translations.json [--external=<dir>]
 *         Checks every answer (same numbers, right script, sane length, no markup) and writes the reviewed file that
 *         `catalogue-apply plan --product-translations=<file>` reads. Rejected answers are counted by reason and left out.
 *         --external=<dir> also reads the `*.jsonl` answer files written outside the server (ar and en targets): lines {product_id, field, source_lang, target_lang, text},
 *         checked by the same rules; a field a provider already answered keeps the provider's answer (shipped dir: src/modules/medicines/data/translations-external).
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
import { resolveModel } from '../modules/ai/ai-model-resolver';
import { PROVIDER_ENV_KEY } from '../modules/ai/ai-provider-catalog';
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
  // gemini: the lite model has the higher free limits and is overloaded less, and a call that hangs is cut at 20 s (a lane is not held for 76 s); both overridable
  const geminiModel = env.TRANSLATE_GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const withLite = [...registry.filter((r) => r.key !== 'gemini'), { ...(registry.find((r) => r.key === 'gemini') ?? { key: 'gemini' }), model: geminiModel }];
  return providerCallersFromEnv({ ...env, CLASSIFY_MODEL: env.TRANSLATE_MODEL || env.CLASSIFY_MODEL }, { registry: withLite, model: env.TRANSLATE_MODEL || env.CLASSIFY_MODEL, timeoutMs: Number(env.TRANSLATE_TIMEOUT_MS) || 180_000, timeoutByProvider: { gemini: Number(env.TRANSLATE_GEMINI_TIMEOUT_MS) || 20_000 } }).map(({ provider, call }) => {
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

export type ExternalRejection = Rejection | 'bad_line' | 'target_not_allowed' | 'unknown_gap' | 'source_mismatch' | 'duplicate' | 'provider_answered';
export interface ExternalLine { product_id: string; field: string; source_lang: string; target_lang: string; text: string }
export interface ExternalOutcome { accepted: number; rejected: Record<ExternalRejection, number>; by_target: Record<string, number> }
/** Only these targets are read from the external answer files for now. */
export const EXTERNAL_TARGETS: readonly string[] = ['ar', 'en'];

/**
 * Answers written outside the server (JSONL lines `{product_id, field, source_lang, target_lang, text}`) go through the SAME `checkTranslation` rules
 * as the model's: the source text is the one the request file holds for that product, field and target. A field a provider already answered
 * (`plan.file.items`) is left to the provider; the accepted lines are added to the file. Rejected lines are counted by reason.
 */
export function mergeExternal(plan: PlanOutcome, reqs: TranslateRequest[], lines: unknown[]): ExternalOutcome {
  const rejected: ExternalOutcome['rejected'] = { empty: 0, numbers_differ: 0, wrong_script: 0, length: 0, format: 0, bad_line: 0, target_not_allowed: 0, unknown_gap: 0, source_mismatch: 0, duplicate: 0, provider_answered: 0 };
  const by_target: Record<string, number> = {};
  const sources = new Map<string, { req: TranslateRequest; text: string }>();
  for (const req of reqs) for (const it of req.items) sources.set(`${it.id}|${it.field}|${req.target}`, { req, text: it.text });
  const taken = new Set(plan.file.items.map((i) => `${i.id}|${i.field}|${i.target}`));
  const seen = new Set<string>();
  let accepted = 0;
  for (const raw of lines) {
    const l = raw as Partial<ExternalLine> | null;
    if (!l || typeof l.product_id !== 'string' || typeof l.field !== 'string' || typeof l.source_lang !== 'string' || typeof l.target_lang !== 'string' || typeof l.text !== 'string') { rejected.bad_line += 1; continue; }
    if (!EXTERNAL_TARGETS.includes(l.target_lang)) { rejected.target_not_allowed += 1; continue; }
    const key = `${l.product_id}|${l.field}|${l.target_lang}`;
    const src = sources.get(key);
    if (!src) { rejected.unknown_gap += 1; continue; }
    if (src.req.source !== l.source_lang) { rejected.source_mismatch += 1; continue; }
    if (seen.has(key)) { rejected.duplicate += 1; continue; }
    if (taken.has(key)) { rejected.provider_answered += 1; continue; }
    const why = checkTranslation(src.text, l.text, src.req.target);
    if (why) { rejected[why] += 1; continue; }
    plan.file.items.push({ id: l.product_id, field: l.field as TranslationItem['field'], target: src.req.target, source: src.req.source, text: l.text.trim(), source_sha: sha256(src.text) });
    by_target[src.req.target] = (by_target[src.req.target] ?? 0) + 1;
    seen.add(key);
    accepted += 1;
  }
  plan.file.items.sort((x, y) => TARGET_ORDER.indexOf(x.target) - TARGET_ORDER.indexOf(y.target) || x.id.localeCompare(y.id) || x.field.localeCompare(y.field));
  return { accepted, rejected, by_target };
}

/** Every `*.jsonl` of a directory, in file-name order; a line that is not JSON is kept as `null` so it is counted as a bad line. */
export function readExternalDir(dir: string): unknown[] {
  if (!fs.existsSync(dir)) return [];
  const out: unknown[] = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch { out.push(null); }
    }
  }
  return out;
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

/** Moves each `ai_providers.model` to the model the probe proved works, only where it differs; the write names the old id, so a record changed meanwhile is left alone. */
export async function applyModels(env: NodeJS.ProcessEnv, results: Array<{ provider: string; model: string; status: string; from: string }>, apply: boolean): Promise<number> {
  const changes = results.filter((r) => r.status === 'ok' && r.model !== r.from);
  out({ step: 'models', apply, would_change: changes.map((c) => ({ provider: c.provider, from: c.from, to: c.model })), unchanged: results.filter((r) => r.status === 'ok' && r.model === r.from).map((r) => r.provider), failed: results.filter((r) => r.status !== 'ok').map((r) => r.provider) });
  if (!apply || !changes.length) return 0;
  const uri = env.MONGO_URL; if (!uri) throw new Error('MONGO_URL is not set');
  const conn = await mongoose.createConnection(uri, { dbName: env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 1 }).asPromise();
  try {
    for (const c of changes) {
      const r = await conn.db!.collection('ai_providers').updateOne({ key: c.provider, model: c.from }, { $set: { model: c.model, previous_model: c.from, model_changed_at: new Date() } });
      out({ provider: c.provider, from: c.from, to: c.model, updated: r.modifiedCount === 1 });
    }
  } finally { await conn.close(); }
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const step = argv[0];
  if (step === 'probe' || step === 'models') {
    // probe: one tiny request per provider that has a key, side by side. A 404 (retired model) makes the caller list the provider's models with the same key and
    // retry with the first preferred one that exists. Prints provider, model (the one that answered), status (ok|failed) and class (ok | http_404 | quota | ...). Nothing else.
    // models [--apply]: the same, then the `ai_providers` record's `model` is moved to the model that was PROVED to answer (compare-and-set on the old id; dry run without --apply).
    const registry = await loadRegistry(process.env);
    const calls = providerCallersFromEnv(process.env, { registry, timeoutMs: Number(process.env.TRANSLATE_PROBE_TIMEOUT_MS) || 30_000 });
    const results: Array<{ provider: string; model: string; status: 'ok' | 'failed'; class: string; from: string }> = [];
    await Promise.all(calls.map(async ({ provider, call, model, listStatus, preferredListed }) => {
      let cls = 'ok';
      try { await call('Reply with the single word OK.'); } catch (e) { cls = errorClass(e); }
      let chosen = model();
      let status: 'ok' | 'failed' = cls === 'ok' ? 'ok' : 'failed';
      const listHttp = await listStatus();
      const preferredIds = await preferredListed();      // how many of MODEL_PREFERENCE the provider's list has (a count; null = list unreadable)      // the HTTP status of the provider's model-list call, a number only: 200 = this key can list models
      if (step === 'models') {
        // A record can sit on a model that works but is not the best one (a reasoning model, a slow free one): move to the best PREFERRED model only when it is proved to answer.
        const key = String(process.env[PROVIDER_ENV_KEY[provider.key]] || '').trim();
        const best = await resolveModel(provider.key, provider.base_url, key, undefined, fetch).catch(() => null);
        if (best && best !== chosen) {
          const [tryBest] = providerCallersFromEnv({ [PROVIDER_ENV_KEY[provider.key]]: key }, { registry: [{ key: provider.key, model: best, base_url: provider.base_url }], timeoutMs: Number(process.env.TRANSLATE_PROBE_TIMEOUT_MS) || 30_000 });
          try { await tryBest.call('Reply with the single word OK.'); chosen = tryBest.model(); status = 'ok'; cls = 'ok'; } catch { /* the best one does not answer: the current model stays */ }
        }
      }
      const r = { provider: provider.key, model: chosen, status, class: cls, from: provider.model };
      results.push(r);
      out(step === 'probe' ? { provider: r.provider, model: r.model, status: r.status, class: r.class, models_list_http: listHttp, preferred_listed: preferredIds } : { provider: r.provider, from: r.from, to: r.model, status: r.status, class: r.class, models_list_http: listHttp });
    }));
    if (step === 'models') return (await applyModels(process.env, results, argv.includes('--apply')));
    return results.every((r) => r.status === 'failed') ? 1 : 0;
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
    const externalDir = arg(argv, 'external');
    const external = externalDir ? mergeExternal(plan, readJsonl<TranslateRequest>(requests), readExternalDir(externalDir)) : undefined;
    fs.writeFileSync(outFile, JSON.stringify(plan.file, null, 1));
    out({ step, moves: summarizeMoves(moves), accepted: plan.accepted, rejected: plan.rejected, by_target: plan.by_target, ...(external ? { external } : {}), total_items: plan.file.items.length, file: outFile, file_sha256: sha256(fs.readFileSync(outFile, 'utf8')) });
    return 0;
  }
  throw new Error('usage: translate-product-content <gaps|probe|models|run|plan>');
}

if (require.main === module) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://<hidden>').slice(0, 300)}`); process.exit(1); });
}
