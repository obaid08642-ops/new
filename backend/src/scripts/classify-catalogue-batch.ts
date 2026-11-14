/**
 * #1556 decision C (owner, 2026-10-16): classify every catalogue record against the category tree with a
 * small model, in a batch job run OUTSIDE the session, and apply only the clear moves.
 *
 * Steps (each is a separate command, JSONL in / JSONL out):
 *   estimate  --input export.jsonl [--batch 40]
 *             tokens per record / per request and the price at the configured model (no network).
 *   prompts   --input export.jsonl --out requests.jsonl [--batch 40]
 *             the tree (8 main trees, every existing path, numbered) + compact record lines per request.
 *   run       --requests requests.jsonl --out responses.jsonl [--rpm 60]
 *             calls the model. Resumable: request ids already in --out are skipped. Rate-limited.
 *             Key from the environment only (GEMINI_API_KEY, or OPENAI_API_KEY with AI_PROVIDER=openai),
 *             same variables as the backend's AiProviderService. Nothing secret is stored in the repo.
 *   plan      --input export.jsonl --requests requests.jsonl --responses responses.jsonl --out ./classify
 *             clear moves vs doubtful (same thresholds as the extra-mains merge, see isClearMove).
 *   apply     --plan ./classify/moves.json   (MONGO_URL + CATALOGUE_CLASSIFY_CONFIRM=apply)
 *             writes only status "move", guarded by the before path; audit in catalogue_category_moves.
 *
 *   npx ts-node --transpile-only src/scripts/classify-catalogue-batch.ts <step> ...
 */
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';
import { Caller, chainCallerFromEnv } from '../modules/ai/env-chain';
import {
  CatalogueRecord, MAIN_TREES, MainTree, MoveRow, THRESHOLDS, TreeIndex, TreePath, applyMoves, buildSet, buildTree,
  classifyMain, pathOf, proposePath, readExport, recordId, toCsv, AuditCollection, UpdateCollection,
} from './merge-extra-main-categories';

// ---------------------------------------------------------------------------
// Model config + published price (USD per 1M tokens)
// ---------------------------------------------------------------------------

/**
 * Cheapest model on the provider the backend is configured with (AI_PROVIDER defaults to gemini).
 * Source: https://ai.google.dev/gemini-api/docs/pricing (read 2026-10-16), Gemini 2.5 Flash-Lite paid tier:
 * input $0.10 / output $0.40 per 1M tokens (text); Batch API $0.05 / $0.20.
 * The backend default `gemini-2.0-flash` is no longer listed on that page.
 */
export const PRICES: Record<string, { input: number; output: number; batchInput: number; batchOutput: number; source: string }> = {
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40, batchInput: 0.05, batchOutput: 0.20, source: 'https://ai.google.dev/gemini-api/docs/pricing (2026-10-16)' },
};
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const DEFAULT_BATCH = 40;
/** The model's own confidence a move needs, on top of the shared rule thresholds. */
export const MODEL_MIN_CONFIDENCE = 0.85;

// ---------------------------------------------------------------------------
// Token approximation (no tokenizer in the repo): ~4 chars per token for Latin text and digits (Google's
// published rule of thumb), ~2 chars per token for Arabic / Devanagari / Bengali script, 1 per other symbol.
// ---------------------------------------------------------------------------

export function approxTokens(s: string): number {
  let latin = 0;
  let other = 0;
  let sym = 0;
  for (const ch of s) {
    if (/[A-Za-z0-9\s]/.test(ch)) latin += 1;
    else if (/[؀-ۿऀ-ॿঀ-৿]/.test(ch)) other += 1;
    else sym += 1;
  }
  return Math.ceil(latin / 4 + other / 2 + sym);
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export interface TreeList {
  /** 1-based number -> path key ("main > sub > subSub") */
  keys: string[];
  text: string;
}

const enLabel = (p: TreePath) => [p.labels.en?.main_category, p.labels.en?.sub_category, p.labels.en?.sub_sub_category].filter(Boolean).join(' > ');

export function treeList(tree: TreeIndex): TreeList {
  const keys = [...tree.paths.keys()].sort();
  // English labels when every level has one (shorter in tokens), else the Arabic path.
  const lines = keys.map((k, i) => {
    const p = tree.paths.get(k) as TreePath;
    const en = enLabel(p);
    return `${i + 1}|${en.split(' > ').length === k.split(' > ').length ? en : k}`;
  });
  return { keys, text: lines.join('\n') };
}

export const INSTRUCTIONS =
  'You place pharmacy products in a category tree. Tree lines are "number|path". ' +
  'For each product line "i|english name|arabic name|rx" answer with JSON only: ' +
  '[{"i":<i>,"p":<tree number>,"c":<confidence 0..1>}]. Choose by what the product is, not by brand. ' +
  'Prescription (rx=1) items belong under medicines. If unsure, give c below 0.5.';

export function recordLine(i: number, r: CatalogueRecord): string {
  const clip = (s: unknown) => (typeof s === 'string' ? s.replace(/[|\n]/g, ' ').slice(0, 90) : '');
  const rx = r.is_prescription === true || r.requires_prescription === true ? 1 : 0;
  return `${i}|${clip(r.name_en || r.translations?.en?.name)}|${clip(r.name_ar || r.translations?.ar?.name)}|${rx}`;
}

export interface BatchRequest {
  id: string;
  record_ids: string[];
  prompt: string;
}

export function buildRequests(records: CatalogueRecord[], tree: TreeList, batch = DEFAULT_BATCH): BatchRequest[] {
  const out: BatchRequest[] = [];
  for (let s = 0; s < records.length; s += batch) {
    const chunk = records.slice(s, s + batch);
    const lines = chunk.map((r, i) => recordLine(i, r));
    out.push({
      id: `req_${String(s / batch).padStart(5, '0')}`,
      record_ids: chunk.map(recordId),
      prompt: `${INSTRUCTIONS}\nTREE\n${tree.text}\nPRODUCTS\n${lines.join('\n')}`,
    });
  }
  return out;
}

export interface Estimate {
  records: number;
  requests: number;
  tree_tokens_per_request: number;
  record_tokens_avg: number;
  output_tokens_per_record: number;
  input_tokens_per_record: number;
  total_input_tokens: number;
  total_output_tokens: number;
  model: string;
  usd_standard: number;
  usd_batch_api: number;
  price_source: string;
}

/** Output per record: `{"i":12,"p":345,"c":0.93},` */
export const OUTPUT_TOKENS_PER_RECORD = approxTokens('{"i":12,"p":345,"c":0.93},');

export function estimate(records: CatalogueRecord[], tree: TreeList, totalRecords = records.length, batch = DEFAULT_BATCH, model = DEFAULT_MODEL): Estimate {
  const treeTokens = approxTokens(`${INSTRUCTIONS}\nTREE\n${tree.text}\nPRODUCTS\n`);
  const recTokens = records.length ? records.reduce((a, r, i) => a + approxTokens(recordLine(i % batch, r)) + 1, 0) / records.length : 0;
  const requests = Math.ceil(totalRecords / batch);
  const totalIn = Math.round(requests * treeTokens + totalRecords * recTokens);
  const totalOut = Math.round(totalRecords * OUTPUT_TOKENS_PER_RECORD + requests * 2);
  const p = PRICES[model];
  return {
    records: totalRecords, requests, tree_tokens_per_request: treeTokens, record_tokens_avg: Math.round(recTokens * 10) / 10,
    output_tokens_per_record: OUTPUT_TOKENS_PER_RECORD, input_tokens_per_record: Math.round((totalIn / totalRecords) * 10) / 10,
    total_input_tokens: totalIn, total_output_tokens: totalOut, model,
    usd_standard: Math.round(((totalIn * p.input + totalOut * p.output) / 1e6) * 100) / 100,
    usd_batch_api: Math.round(((totalIn * p.batchInput + totalOut * p.batchOutput) / 1e6) * 100) / 100,
    price_source: p.source,
  };
}

// ---------------------------------------------------------------------------
// Run (network) — resumable, rate-limited
// ---------------------------------------------------------------------------

export type { Caller };

/** One fallback chain over every provider whose key is set (see modules/ai/env-chain.ts); `CLASSIFY_MODEL` applies to the primary one. */
export function callerFromEnv(env: NodeJS.ProcessEnv = process.env): Caller {
  return chainCallerFromEnv(env, { model: env.CLASSIFY_MODEL });
}

export interface RunIo {
  done: Set<string>;
  write(line: string): void;
  sleep(ms: number): Promise<void>;
}

export async function runRequests(reqs: BatchRequest[], call: Caller, io: RunIo, rpm = 60, maxRetries = 4): Promise<{ sent: number; skipped: number; failed: number }> {
  const gap = Math.ceil(60000 / Math.max(1, rpm));
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const req of reqs) {
    if (io.done.has(req.id)) { skipped += 1; continue; }
    let attempt = 0;
    for (;;) {
      try {
        const text = await call(req.prompt);
        io.write(JSON.stringify({ id: req.id, text }));
        io.done.add(req.id);
        sent += 1;
        break;
      } catch (e) {
        attempt += 1;
        if (attempt > maxRetries) { failed += 1; break; }
        await io.sleep(gap * 2 ** attempt);
      }
    }
    await io.sleep(gap);
  }
  return { sent, skipped, failed };
}

// ---------------------------------------------------------------------------
// Plan: clear moves vs doubtful
// ---------------------------------------------------------------------------

export interface Answer { i: number; p: number; c: number }

export function parseAnswers(text: string): Answer[] {
  const m = /\[[\s\S]*\]/.exec(text);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as unknown[];
    return arr.filter((a): a is Answer => !!a && typeof a === 'object'
      && Number.isInteger((a as Answer).i) && Number.isInteger((a as Answer).p) && typeof (a as Answer).c === 'number');
  } catch {
    return [];
  }
}

/**
 * Same rule thresholds as the extra-mains merge: a move is clear only when the model is sure AND the
 * catalogue's own evidence agrees — the keyword rule names the same main tree on a product-type word, or the
 * nearest products in that main tree vote for the model's path (agreement >= THRESHOLDS.pathAgreement with
 * >= THRESHOLDS.minSharedWords shared words). A prescription item is never moved out of medicines.
 */
export function isClearMove(r: CatalogueRecord, target: TreePath, targetKey: string, modelConfidence: number, tree: TreeIndex): { clear: boolean; reason: string } {
  const reasons: string[] = [];
  if (modelConfidence < MODEL_MIN_CONFIDENCE) reasons.push(`model confidence ${modelConfidence}`);
  const rx = r.is_prescription === true || r.requires_prescription === true;
  if (rx && target.main !== 'الأدوية والعلاج') reasons.push('prescription item outside medicines');
  const rule = classifyMain(r);
  const ruleAgrees = rule.strength === 'type' && !rule.conflicts.length && rule.main === target.main;
  const nn = proposePath(r, target.main as MainTree, tree);
  const nnAgrees = nn.path === targetKey && nn.agreement >= THRESHOLDS.pathAgreement && nn.sharedWords >= THRESHOLDS.minSharedWords;
  if (!ruleAgrees && !nnAgrees) reasons.push(`no rule or neighbour evidence (rule ${rule.rule}, neighbours ${nn.agreement.toFixed(2)})`);
  if (rule.strength === 'type' && !rule.conflicts.length && rule.main && rule.main !== target.main) reasons.push(`rule says ${rule.main}`);
  return { clear: reasons.length === 0, reason: reasons.join('; ') };
}

export function planFromResponses(records: CatalogueRecord[], reqs: BatchRequest[], responses: Array<{ id: string; text: string }>, tree: TreeIndex, list: TreeList): MoveRow[] {
  const byId = new Map(records.map((r) => [recordId(r), r]));
  const answered = new Map(responses.map((x) => [x.id, parseAnswers(x.text)]));
  const out: MoveRow[] = [];
  for (const req of reqs) {
    const answers = answered.get(req.id);
    if (!answers) continue; // not run yet
    const byI = new Map(answers.map((a) => [a.i, a]));
    req.record_ids.forEach((rid, i) => {
      const r = byId.get(rid);
      if (!r) return;
      const base = { sku: r.sku === null || r.sku === undefined ? null : String(r.sku), id: rid, _id: r._id, name_en: String(r.name_en || ''), from: pathOf(r), before_category: String(r.category || '') };
      const a = byI.get(i);
      const key = a ? list.keys[a.p - 1] : undefined;
      if (!a || !key) {
        out.push({ ...base, status: 'doubtful', to: null, rule: 'model', confidence: 0, reason: 'no valid answer', set: null });
        return;
      }
      if (key === base.from) return; // already in place
      const target = tree.paths.get(key) as TreePath;
      const v = isClearMove(r, target, key, a.c, tree);
      out.push({ ...base, status: v.clear ? 'move' : 'doubtful', to: key, rule: 'model', confidence: a.c, reason: v.reason, set: buildSet(r, target) });
    });
  }
  return out;
}

/** Records of the 8 trees only feed the tree; every record is classified. */
export function treeFrom(records: CatalogueRecord[]): { tree: TreeIndex; list: TreeList } {
  const tree = buildTree(records.filter((r) => (MAIN_TREES as readonly string[]).includes(String(r.category))));
  return { tree, list: treeList(tree) };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  return {
    step: argv[0], input: get('--input'), out: get('--out'), requests: get('--requests'), responses: get('--responses'), plan: get('--plan'),
    batch: Number(get('--batch') || DEFAULT_BATCH), rpm: Number(get('--rpm') || 60), total: get('--total') ? Number(get('--total')) : undefined,
  };
}

async function main() {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const a = parseArgs(process.argv.slice(2));
  const need = (v: string | undefined, name: string): string => { if (!v) throw new Error(`${name} is required`); return v; };
  const jsonl = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

  if (a.step === 'estimate') {
    const records = readExport(fs.readFileSync(need(a.input, '--input'), 'utf8'));
    console.log(JSON.stringify(estimate(records, treeFrom(records).list, a.total ?? records.length, a.batch), null, 2));
    return;
  }
  if (a.step === 'prompts') {
    const records = readExport(fs.readFileSync(need(a.input, '--input'), 'utf8'));
    const reqs = buildRequests(records, treeFrom(records).list, a.batch);
    fs.writeFileSync(need(a.out, '--out'), reqs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(JSON.stringify({ step: 'prompts', records: records.length, requests: reqs.length, out: a.out }));
    return;
  }
  if (a.step === 'run') {
    const reqs = jsonl(need(a.requests, '--requests')) as BatchRequest[];
    const outFile = need(a.out, '--out');
    const done = new Set((jsonl(outFile) as Array<{ id: string }>).map((x) => x.id));
    const res = await runRequests(reqs, callerFromEnv(), {
      done, write: (line) => fs.appendFileSync(outFile, line + '\n'), sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    }, a.rpm);
    console.log(JSON.stringify({ step: 'run', ...res, out: outFile }));
    return;
  }
  if (a.step === 'plan') {
    const records = readExport(fs.readFileSync(need(a.input, '--input'), 'utf8'));
    const { tree, list } = treeFrom(records);
    const reqs = jsonl(need(a.requests, '--requests')) as BatchRequest[];
    const plan = planFromResponses(records, reqs, jsonl(need(a.responses, '--responses')), tree, list);
    const out = need(a.out, '--out');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'moves.json'), JSON.stringify(plan.map(({ _id, ...rest }) => ({ ...rest, record_key: _id && typeof _id === 'object' ? String(_id) : _id })), null, 2));
    fs.writeFileSync(path.join(out, 'moves.csv'), toCsv(plan));
    fs.writeFileSync(path.join(out, 'doubtful.csv'), toCsv(plan.filter((p) => p.status === 'doubtful')));
    console.log(JSON.stringify({ step: 'plan', records: records.length, proposed_changes: plan.length, clear_moves: plan.filter((p) => p.status === 'move').length, doubtful: plan.filter((p) => p.status === 'doubtful').length, out }));
    return;
  }
  if (a.step === 'apply') {
    if (process.env.CATALOGUE_CLASSIFY_CONFIRM !== 'apply') throw new Error('Set CATALOGUE_CLASSIFY_CONFIRM=apply to write');
    if (!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URL);
    const approved = JSON.parse(fs.readFileSync(need(a.plan, '--plan'), 'utf8')) as Array<MoveRow & { record_key?: unknown }>;
    const plan: MoveRow[] = approved.map((r) => ({ ...r, _id: typeof r.record_key === 'string' && /^[0-9a-f]{24}$/i.test(r.record_key) ? new mongoose.Types.ObjectId(r.record_key) : r.record_key }));
    const runId = `classify-${new Date().toISOString()}`;
    const modified = await applyMoves(plan, mongoose.connection.collection(CATALOG_COLLECTIONS.medicines) as unknown as UpdateCollection, mongoose.connection.collection('catalogue_category_moves') as unknown as AuditCollection, runId);
    console.log(JSON.stringify({ step: 'apply', run_id: runId, planned: plan.filter((p) => p.status === 'move').length, modified }));
    await mongoose.disconnect();
    return;
  }
  throw new Error('step must be one of: estimate | prompts | run | plan | apply');
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
