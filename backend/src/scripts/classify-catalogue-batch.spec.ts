import * as fs from 'fs';
import * as path from 'path';
import {
  BatchRequest, MODEL_MIN_CONFIDENCE, approxTokens, buildRequests, estimate, parseAnswers, planFromResponses, runRequests, treeFrom,
} from './classify-catalogue-batch';
import { CatalogueRecord } from './merge-extra-main-categories';

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', 'catalogue-sample.json'), 'utf8')) as CatalogueRecord[];
const { tree, list } = treeFrom(sample);
const keyOf = (main: string, sub: string, subSub: string) => list.keys.indexOf(`${main} > ${sub} > ${subSub}`) + 1;

describe('#1556 C: batch classification job', () => {
  it('builds compact prompts: tree once per request, one short line per record, no secrets', () => {
    const reqs = buildRequests(sample, list, 8);
    expect(reqs).toHaveLength(3);
    expect(reqs[0].record_ids).toHaveLength(8);
    expect(reqs[0].prompt).toContain('1|');
    expect(reqs[0].prompt).toContain('Nexium 40mg 14 Tablets|نيكسيوم 40 مجم 14 قرص|1');
    expect(reqs[0].prompt).not.toMatch(/API_KEY|AIza|sk-/);
  });

  it('estimates tokens and cost from the fixture (tokenizer approximation)', () => {
    const e = estimate(sample, list, 20990, 40);
    expect(e.records).toBe(20990);
    expect(e.requests).toBe(525);
    expect(e.record_tokens_avg).toBeGreaterThan(10);
    expect(e.record_tokens_avg).toBeLessThan(60);
    expect(e.usd_batch_api).toBeLessThan(e.usd_standard);
    expect(e.price_source).toContain('ai.google.dev');
    expect(approxTokens('abcd')).toBe(1);
    expect(approxTokens('ابجد')).toBe(2);
  });

  it('run is resumable and retries with backoff', async () => {
    const reqs: BatchRequest[] = [{ id: 'a', record_ids: [], prompt: 'x' }, { id: 'b', record_ids: [], prompt: 'y' }, { id: 'c', record_ids: [], prompt: 'z' }];
    const lines: string[] = [];
    let calls = 0;
    const call = async () => { calls += 1; if (calls === 2) throw new Error('429'); return '[]'; };
    const io = { done: new Set(['a']), write: (l: string) => lines.push(l), sleep: async () => undefined };
    expect(await runRequests(reqs, call, io, 600)).toEqual({ sent: 2, skipped: 1, failed: 0 });
    expect(lines.map((l) => JSON.parse(l).id)).toEqual(['b', 'c']);
    expect(await runRequests(reqs, call, io, 600)).toEqual({ sent: 0, skipped: 3, failed: 0 });
  });

  it('parses only well-formed answers', () => {
    expect(parseAnswers('```json\n[{"i":0,"p":3,"c":0.9},{"i":"x"}]\n```')).toEqual([{ i: 0, p: 3, c: 0.9 }]);
    expect(parseAnswers('not json')).toEqual([]);
  });

  it('applies only clear moves; doubtful ones are listed (red before: brush sits under moisturisers)', () => {
    const brush = sample.find((r) => r.sku === 900120) as CatalogueRecord;
    expect(brush.sub_category).toBe('الترطيب');
    const reqs = buildRequests(sample, list, 40);
    const lipstick = keyOf('المكياج والإكسسوارات', 'مكياج الشفاه', 'أحمر الشفاه');
    const vitD = keyOf('الفيتامينات والتغذية الصحية', 'الفيتامينات المتعددة', 'فيتامين د');
    const idx = (sku: number) => sample.findIndex((r) => r.sku === sku);
    const answers = [
      // brush -> makeup tools? the tree has no brush path; model picks lipstick with low confidence -> doubtful
      { i: idx(900120), p: lipstick, c: 0.4 },
      // Nexium (rx) moved to vitamins with high confidence -> refused (rx outside medicines)
      { i: idx(900101), p: vitD, c: 0.99 },
      // Centrum: model moves it to vitamin D, rule + neighbours agree on vitamins -> clear move
      { i: idx(900105), p: vitD, c: 0.95 },
      // Dove soap -> lipstick, confident model but rule says personal care -> doubtful
      { i: idx(900116), p: lipstick, c: 0.97 },
    ];
    const plan = planFromResponses(sample, reqs, [{ id: reqs[0].id, text: JSON.stringify(answers) }], tree, list);
    const row = (sku: number) => plan.find((p) => p.sku === String(sku));
    expect(row(900120)?.status).toBe('doubtful');
    expect(row(900101)).toMatchObject({ status: 'doubtful' });
    expect(row(900101)?.reason).toContain('prescription');
    expect(row(900116)?.status).toBe('doubtful');
    expect(row(900105)?.status === 'move' || row(900105) === undefined).toBe(true);
    // records without an answer are listed, never moved
    expect(plan.filter((p) => p.reason === 'no valid answer').length).toBe(sample.length - answers.length);
    expect(plan.filter((p) => p.status === 'move').every((p) => (p.confidence as number) >= MODEL_MIN_CONFIDENCE)).toBe(true);
  });
});
