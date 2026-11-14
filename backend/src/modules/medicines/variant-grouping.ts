import { createHash } from 'crypto';

/**
 * Owner decision D (issue 1556, 2026-10-16): records that are one product in several powers, colours or shades
 * (Diva lenses by power, Lensme / Newlens lenses whose colour is only in the picture, lip tints by shade) are shown
 * as ONE product with a picker. Nothing is deleted: every record keeps its own id, SKU, price and pictures, and the
 * records of one product share a `variant_group`.
 *
 * The grouping is read from the English name only (the reference name, decision A):
 *  - power: a signed dioptre with two decimals ("-2.50", "+1.25", "−3.00"), or "Plano" / "0.00";
 *  - colour: colour words ("Hazel", "Ocean Blue") — only for lenses and lip products, so "Green Tea Shampoo" is never
 *    a colour variant;
 *  - shade: an explicit shade code ("Shade 03", "No. 12", "#05") on a lip product;
 *  - picture: lenses or lip products whose English names are the same once normalized, and whose only difference is
 *    the picture (Lensme, Newlens). No colour name is invented for them: the picker shows the picture.
 * A group is the normalized rest of the name (the "base") plus the manufacturer, with at least two records.
 */

export type VariantKind = 'power' | 'colour' | 'colour_power' | 'shade' | 'picture';

export type ParsedVariantName = {
  /** The normalized name without the variant attribute (lowercase, single spaces). */
  base: string;
  power?: number;
  colour?: string;
  shade?: string;
  /** The name is a lens or a lip product (the only places a colour or a same-name picture variant is read). */
  context: 'lens' | 'lip' | null;
};

export type VariantAttr = {
  kind: VariantKind;
  power?: number;
  colour?: string;
  shade?: string;
  /** Order inside the group (picture variants have no other attribute to sort by). */
  position: number;
  source: string;
};

export type GroupInput = {
  id: string;
  name_en?: string | null;
  manufacturer?: string | null;
  sku?: number | string | null;
  image?: string | null;
  images?: string[] | null;
  image_1?: string | null;
};

export type VariantGroup = {
  variant_group: string;
  base: string;
  manufacturer: string;
  kind: VariantKind;
  members: Array<{ id: string; sku: number | string | null; name_en: string; variant: VariantAttr }>;
  /** Two members with the same attribute (same power and colour, or the same picture): left for the owner. */
  conflicts: string[][];
};

export const VARIANT_SOURCE = 'name_en-parse-2026-10';

const LENS = /\b(lens|lenses|contact|contacts|diva|lensme|newlens)\b/i;
const LIP = /\b(lip|lips|lipstick|lip\s*tint|tint|gloss|lip\s*balm|lip\s*liner)\b/i;

// Colour vocabulary (English names of the source catalogue). Modifiers only count next to a colour word.
const COLOUR_WORDS = new Set([
  'gray', 'grey', 'brown', 'hazel', 'blue', 'green', 'honey', 'black', 'violet', 'purple', 'turquoise', 'aqua', 'amber',
  'caramel', 'chocolate', 'hazelnut', 'olive', 'emerald', 'sapphire', 'silver', 'gold', 'pink', 'red', 'rose', 'nude',
  'beige', 'coral', 'cherry', 'berry', 'plum', 'mocha', 'cappuccino', 'cinnamon', 'almond', 'ash', 'smoky', 'smokey',
  'lavender', 'lilac', 'peach', 'apricot', 'mauve', 'burgundy', 'wine', 'maroon', 'fuchsia', 'magenta', 'orange', 'yellow',
  'white', 'jade', 'mint', 'teal', 'indigo', 'navy', 'cyan', 'copper', 'bronze', 'taupe', 'sand', 'toffee', 'coffee',
  'latte', 'chestnut', 'walnut', 'mahogany', 'ruby', 'crimson', 'scarlet', 'tan', 'cocoa', 'pearl', 'ivory', 'champagne',
]);
const COLOUR_MODIFIERS = new Set(['light', 'dark', 'deep', 'pure', 'ocean', 'sky', 'royal', 'ice', 'icy', 'crystal', 'golden', 'soft', 'bright', 'pale', 'misty', 'natural', 'sweet', 'hot', 'baby', 'true']);

// A signed dioptre with exactly two decimals ("-2.50", "+ 1.25", "−3.00"); "-30 Gm" or "50 ml" never match.
const POWER = /(^|[\s(/,:])([+\-−–]\s?\d{1,2}[.,]\d{2})(?=$|[\s)/,]|d\b)/i;
const PLANO = /(^|[\s(/,:])(plano|0[.,]00)(?=$|[\s)/,])/i;
const POWER_LABEL = /\b(power|pwr|sph|diopters?|dioptres?)\b\s*:?/gi;
const SHADE = /\b(?:shade|no\.?|n°|#)\s*(\d{1,3}[a-z]?)\b/i;

const norm = (s: string) => s
  .toLowerCase()
  .replace(/[−–]/g, '-')
  .replace(/[(),:/|]+/g, ' ')
  .replace(/\s+-\s+|\s+-$|^-\s+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Reads the variant attribute of one English name. Pure: same input, same output. */
export function parseVariantName(nameEn: string | null | undefined): ParsedVariantName {
  let rest = String(nameEn || '').replace(/\s+/g, ' ').trim();
  const context: ParsedVariantName['context'] = LENS.test(rest) ? 'lens' : LIP.test(rest) ? 'lip' : null;
  const out: ParsedVariantName = { base: '', context };

  if (context === 'lens') {
    const p = rest.match(POWER);
    if (p) {
      out.power = Number(p[2].replace(/[−–]/, '-').replace(/\s/g, '').replace(',', '.'));
      rest = (rest.slice(0, p.index) + p[1] + rest.slice((p.index ?? 0) + p[0].length)).trim();
    } else {
      const z = rest.match(PLANO);
      if (z) {
        out.power = 0;
        rest = (rest.slice(0, z.index) + z[1] + rest.slice((z.index ?? 0) + z[0].length)).trim();
      }
    }
    if (out.power !== undefined) rest = rest.replace(POWER_LABEL, ' ');
  }

  if (context === 'lip') {
    const s = rest.match(SHADE);
    if (s) {
      out.shade = s[1].toLowerCase();
      rest = (rest.slice(0, s.index) + rest.slice((s.index ?? 0) + s[0].length)).trim();
    }
  }

  if (context) {
    // The longest run of colour words (modifiers allowed inside the run when it holds a colour word).
    const words = rest.split(' ');
    let best: [number, number] | null = null;
    for (let i = 0; i < words.length; i++) {
      let j = i;
      let hasColour = false;
      while (j < words.length) {
        const w = words[j].toLowerCase().replace(/[^a-z]/g, '');
        if (COLOUR_WORDS.has(w)) hasColour = true;
        else if (!COLOUR_MODIFIERS.has(w)) break;
        j++;
      }
      if (hasColour && (!best || j - i > best[1] - best[0])) best = [i, j];
    }
    if (best) {
      // a leading modifier belongs to the colour ("Ocean Blue"); a trailing one does not
      const a = best[0];
      let b = best[1];
      while (b > a && !COLOUR_WORDS.has(words[b - 1].toLowerCase().replace(/[^a-z]/g, ''))) b--;
      const colour = words.slice(a, b).join(' ').replace(/[^A-Za-z ]/g, '').trim();
      if (colour) {
        if (context === 'lip' && !out.shade) out.shade = colour.toLowerCase();
        else out.colour = colour.toLowerCase();
        words.splice(a, b - a);
        rest = words.join(' ');
      }
    }
  }

  out.base = norm(rest);
  return out;
}

function groupId(base: string, manufacturer: string) {
  return `vg_${createHash('sha1').update(`${base}|${manufacturer}`).digest('hex').slice(0, 16)}`;
}

const firstImage = (r: GroupInput) => (Array.isArray(r.images) && r.images.find(Boolean)) || r.image_1 || r.image || '';

const powerOrder = (p: number | undefined) => (p === undefined ? 0 : p < 0 ? -p : p === 0 ? 0 : 100 + p);

/**
 * Groups the records. Idempotent: the same records always give the same groups, ids and positions (members are
 * sorted by colour, then power — plano, minus from −0.25 down, then plus — then SKU and id).
 */
export function buildVariantGroups(records: GroupInput[]): VariantGroup[] {
  const buckets = new Map<string, Array<{ r: GroupInput; p: ParsedVariantName }>>();
  for (const r of records) {
    if (!r?.id || !r.name_en) continue;
    const p = parseVariantName(r.name_en);
    if (!p.base) continue;
    const hasAttr = p.power !== undefined || p.colour !== undefined || p.shade !== undefined;
    // Same-name records outside lenses and lip products are duplicates for the owner, never variants.
    if (!hasAttr && !p.context) continue;
    const manufacturer = String(r.manufacturer || '').trim().toLowerCase();
    const key = `${p.base}|${manufacturer}`;
    const list = buckets.get(key) || [];
    list.push({ r, p });
    buckets.set(key, list);
  }

  const groups: VariantGroup[] = [];
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const [base, manufacturer] = key.split('|');
    const anyPower = list.some((x) => x.p.power !== undefined);
    const anyColour = list.some((x) => x.p.colour !== undefined);
    const anyShade = list.some((x) => x.p.shade !== undefined);
    const anyAttr = anyPower || anyColour || anyShade;
    // A same-name bucket is a picture group only when the pictures differ.
    if (!anyAttr && new Set(list.map((x) => firstImage(x.r))).size < 2) continue;
    const kind: VariantKind = anyPower && anyColour ? 'colour_power' : anyPower ? 'power' : anyColour ? 'colour' : anyShade ? 'shade' : 'picture';
    const sorted = [...list].sort((x, y) =>
      String(x.p.colour || x.p.shade || '').localeCompare(String(y.p.colour || y.p.shade || ''))
      || powerOrder(x.p.power) - powerOrder(y.p.power)
      || String(x.r.sku ?? '').localeCompare(String(y.r.sku ?? ''), undefined, { numeric: true })
      || String(x.r.id).localeCompare(String(y.r.id)));
    const seen = new Map<string, string[]>();
    const members = sorted.map((x, position) => {
      const variant: VariantAttr = { kind, position, source: VARIANT_SOURCE };
      if (x.p.power !== undefined) variant.power = x.p.power;
      if (x.p.colour !== undefined) variant.colour = x.p.colour;
      if (x.p.shade !== undefined) variant.shade = x.p.shade;
      const sig = kind === 'picture' ? `img:${firstImage(x.r)}` : `${variant.colour ?? ''}|${variant.shade ?? ''}|${variant.power ?? ''}`;
      seen.set(sig, [...(seen.get(sig) || []), String(x.r.id)]);
      return { id: String(x.r.id), sku: x.r.sku ?? null, name_en: String(x.r.name_en), variant };
    });
    groups.push({
      variant_group: groupId(base, manufacturer),
      base,
      manufacturer,
      kind,
      members,
      conflicts: [...seen.values()].filter((ids) => ids.length > 1),
    });
  }
  return groups.sort((a, b) => b.members.length - a.members.length || a.base.localeCompare(b.base));
}

/** Plano, then minus powers from −0.25 down, then plus powers up (the picker's order). */
export function comparePower(a?: number, b?: number) {
  return powerOrder(a) - powerOrder(b);
}
