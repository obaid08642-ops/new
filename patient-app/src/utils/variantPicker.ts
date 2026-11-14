/**
 * Owner decision D (issue 1556, 2026-10-16): one product, several powers, colours or shades (Diva lenses by power,
 * Lensme / Newlens lenses whose colour is only in the picture, lip tints by shade). Each variant is its own catalogue
 * record (its own id, SKU, price and picture); GET /public/product-variants/:locale/:id lists them.
 * Pure helpers for the product page's picker (components/pharmacy/VariantPicker).
 */
export type VariantAttr = { kind: string; power: number | null; colour: string | null; shade: string | null; position: number };

export type ProductVariant = {
  id: string;
  sku: number | null;
  slug: string;
  name: string | null;
  price: number;
  available: boolean;
  image: string | null;
  variant: VariantAttr;
};

export type Swatch = { key: string; label: string; first: ProductVariant; available: boolean };

/** The catalogue locale of the public API for the app's language (Filipino is `tl` in the app and `fil` in the API). */
export const productLocaleOf = (dbLang: string) => (dbLang === 'tl' ? 'fil' : dbLang);

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
export const swatchKeyOf = (v: ProductVariant) => v.variant.colour ?? v.variant.shade ?? (v.variant.power === null ? v.id : null);

/** A power with its sign and two decimals, in the app's language ("-2.50", "+1.25", "0.00"). */
export function formatPower(locale: string, power: number) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(power);
}

/** One swatch per colour/shade (its first variant's picture), or one per variant when only the picture differs: those are "Option n", never an invented colour. */
export function buildSwatches(variants: ProductVariant[], optionLabel: (n: number) => string): Swatch[] {
  const out: Swatch[] = [];
  const pictureOnly = variants.every((v) => v.variant.colour === null && v.variant.shade === null && v.variant.power === null);
  for (const v of variants) {
    const key = swatchKeyOf(v);
    if (key === null) continue;
    const hit = out.find((s) => s.key === key);
    if (hit) {
      hit.available = hit.available || v.available;
      continue;
    }
    const word = v.variant.colour ?? v.variant.shade;
    out.push({ key, label: word && !pictureOnly ? titleCase(word) : optionLabel(out.length + 1), first: v, available: v.available });
  }
  return out;
}

/** The powers of the chosen colour (Diva: colour first), on the chosen side (minus or plus) when both exist. */
export function visiblePowers(variants: ProductVariant[], selected: ProductVariant, sign: 'minus' | 'plus' | null) {
  const key = swatchKeyOf(selected);
  const powers = variants.filter((v) => v.variant.power !== null && (key === null || !(selected.variant.colour || selected.variant.shade) || swatchKeyOf(v) === key));
  const hasMinus = powers.some((v) => (v.variant.power ?? 0) <= 0);
  const hasPlus = powers.some((v) => (v.variant.power ?? 0) > 0);
  const activeSign: 'minus' | 'plus' = sign ?? ((selected.variant.power ?? 0) > 0 ? 'plus' : hasMinus ? 'minus' : 'plus');
  const shown = powers.filter((v) => !(hasMinus && hasPlus) || (activeSign === 'plus' ? (v.variant.power ?? 0) > 0 : (v.variant.power ?? 0) <= 0));
  return { powers, shown, hasMinus, hasPlus, activeSign };
}

/** Choosing a colour keeps the chosen power when that colour has it, else its first available variant. */
export function variantForSwatch(variants: ProductVariant[], key: string, selected: ProductVariant): ProductVariant | undefined {
  const same = variants.filter((v) => swatchKeyOf(v) === key && v.available);
  return same.find((v) => v.variant.power !== null && v.variant.power === selected.variant.power) ?? same[0];
}
