/**
 * R11: money as integer halalas (1 SAR = 100 halalas). JS doubles cannot hold 0.1 + 0.2 or 1.005 exactly, so every sum, share and refund fraction
 * in the new code is computed on safe integers and only converted to SAR for display or for the (legacy) double fields still in the schemas.
 *
 *   toHalalas(12.34) === 1234      toHalalas('12.345') === 1235 (half away from zero, decided on the decimal text, not on a binary double)
 *   fromHalalas(1234) === 12.34    formatSar(1234) === '12.34'
 *   rateOf(1000, 15, 100)          15 % of 10.00 SAR = 150 halalas, rounded half away from zero, exact via BigInt
 *   allocate(100, [1, 1, 1])       [34, 33, 33]: the parts always add up to the total
 */
export type Halalas = number;

const MAX = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) { super(message); this.name = 'MoneyError'; }
}

export function assertHalalas(h: unknown, what = 'amount'): asserts h is Halalas {
  if (typeof h !== 'number' || !Number.isSafeInteger(h)) throw new MoneyError(`${what} must be a safe integer of halalas, got ${String(h)}`);
}

/** SAR (number or decimal text) to halalas. Rounds half away from zero on the third decimal; throws on NaN, Infinity and values beyond 2^53 halalas. */
export function toHalalas(sar: number | string): Halalas {
  let text: string;
  if (typeof sar === 'number') {
    if (!Number.isFinite(sar)) throw new MoneyError(`not a finite amount: ${sar}`);
    text = sar.toFixed(8);            // 8 decimals hide binary noise (1.005 is 1.00499999999999989... but prints 1.00500000)
  } else {
    text = sar.trim();
  }
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) throw new MoneyError(`not a decimal amount: ${String(sar)}`);
  const frac = (m[3] ?? '').padEnd(3, '0');
  let h = BigInt(m[2]) * 100n + BigInt(frac.slice(0, 2));
  if (frac.charCodeAt(2) >= 53) h += 1n;   // third decimal digit >= 5
  if (m[1] === '-') h = -h;
  if (h > BigInt(MAX) || h < -BigInt(MAX)) throw new MoneyError(`amount out of range: ${String(sar)}`);
  return Number(h) + 0;                     // + 0 turns -0 into 0
}

export function fromHalalas(h: Halalas): number {
  assertHalalas(h);
  return h / 100;
}

/** '1234' -> '12.34', '-5' -> '-0.05'. Exact (no floating point). */
export function formatSar(h: Halalas): string {
  assertHalalas(h);
  const neg = h < 0;
  const a = Math.abs(h);
  return `${neg ? '-' : ''}${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
}

export function sumHalalas(values: Halalas[]): Halalas {
  let total = 0;
  for (const v of values) { assertHalalas(v); total += v; if (!Number.isSafeInteger(total)) throw new MoneyError('sum out of range'); }
  return total;
}

/** h * numerator / denominator, rounded half away from zero, computed with BigInt so it cannot overflow or drift. */
export function rateOf(h: Halalas, numerator: number, denominator: number): Halalas {
  assertHalalas(h);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) throw new MoneyError('rate must be integer / positive integer');
  const n = BigInt(h) * BigInt(numerator);
  const d = BigInt(denominator);
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const q = (2n * abs + d) / (2n * d);     // round half up on the magnitude
  return Number(neg ? -q : q) + 0;
}

/** Percent given as a decimal text or number with at most 4 decimals ('15', 15, '5.25'): converted to basis-point-exact numerator/denominator. */
export function percentOf(h: Halalas, percent: number | string): Halalas {
  const text = typeof percent === 'number' ? percent.toFixed(4) : percent.trim();
  const m = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text);
  if (!m) throw new MoneyError(`not a percent with at most 4 decimals: ${String(percent)}`);
  const scale = 10 ** (m[2] ?? '').length;
  return rateOf(h, Number(m[1]) * scale + Number((m[2] ?? '').padEnd((m[2] ?? '').length, '0') || 0), 100 * scale);
}

/** Splits `total` over `weights` (largest remainder): integer parts that always sum to `total`. Used for refund shares, commission/VAT parts, split payments. */
export function allocate(total: Halalas, weights: number[]): Halalas[] {
  assertHalalas(total, 'total');
  if (!weights.length || weights.some((w) => !Number.isSafeInteger(w) || w < 0)) throw new MoneyError('weights must be non-negative integers');
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) throw new MoneyError('weights sum to zero');
  const sign = total < 0 ? -1 : 1;
  const t = BigInt(Math.abs(total));
  const W = BigInt(sumW);
  const base = weights.map((w) => (t * BigInt(w)) / W);
  let left = Number(t - base.reduce((a, b) => a + b, 0n));
  const order = weights
    .map((w, i) => ({ i, rem: (t * BigInt(w)) % W }))
    .sort((a, b) => (a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1));
  const out = base.map((b) => Number(b));
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length].i] += 1;
  return out.map((v) => sign * v + 0);
}

/** True when a legacy double is a whole number of halalas (no float drift, at most 2 decimals). */
export function isCleanSar(x: unknown): boolean {
  if (typeof x !== 'number' || !Number.isFinite(x)) return false;
  try { return fromHalalas(toHalalas(x)) === x; } catch { return false; }
}
