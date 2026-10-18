"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { Search } from "@/components-next/ui-generated/components/Inputs";
import { productCardImageSrc } from "./catalog-image";
import { ProductGallery } from "./product-gallery";
import { useBuy, type BuyVariant } from "./product-buy";
import styles from "./product-detail.module.css";

/**
 * Owner decision D (issue 1556, 2026-10-16): one product, several powers, colours or shades, built for long lists.
 *  - Colour / shade / picture: swatches drawn from each variant's own picture (lazy). Lensme and Newlens have the
 *    colour only in the picture, so a picture swatch is named "Option n", never an invented colour name.
 *  - Diva: the colour first, then the powers that colour has.
 *  - Power: a sorted grid split into minus and plus, with a search field from 768 px (desktop).
 *  - An unavailable variant is greyed and cannot be chosen. The choice goes to the URL (?v=<id>) through BuyProvider.
 */
export function formatPower(locale: string, power: number) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(power);
}

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
const swatchKeyOf = (v: BuyVariant) => v.colour ?? v.shade ?? (v.power === null ? v.id : null);
const normalizeQuery = (q: string) => q.replace(/[−–]/g, "-").replace(/\s+/g, "").replace(",", ".");

export type Swatch = { key: string; label: string; first: BuyVariant; available: boolean };

/** One swatch per colour/shade (its first variant's picture), or one per variant when only the picture differs. */
export function buildSwatches(variants: BuyVariant[], optionLabel: (n: number) => string): Swatch[] {
  const out: Swatch[] = [];
  const pictureOnly = variants.every((v) => v.colour === null && v.shade === null && v.power === null);
  variants.forEach((v) => {
    const key = swatchKeyOf(v);
    if (key === null) return;
    const hit = out.find((s) => s.key === key);
    if (hit) {
      hit.available = hit.available || v.available;
      return;
    }
    const word = v.colour ?? v.shade;
    out.push({ key, label: word && !pictureOnly ? titleCase(word) : optionLabel(out.length + 1), first: v, available: v.available });
  });
  return out;
}

/**
 * The power buttons to draw: the powers of the chosen colour (Diva: colour first), on the chosen side (minus or
 * plus) when both exist, or every power that matches the search ("-2.5", "2.50", "+1").
 */
export function visiblePowers(variants: BuyVariant[], selected: BuyVariant, query: string, sign: "minus" | "plus" | null) {
  const key = swatchKeyOf(selected);
  const powers = variants.filter((v) => v.power !== null && (key === null || !(selected.colour || selected.shade) || swatchKeyOf(v) === key));
  const hasMinus = powers.some((v) => (v.power ?? 0) <= 0);
  const hasPlus = powers.some((v) => (v.power ?? 0) > 0);
  const activeSign: "minus" | "plus" = sign ?? ((selected.power ?? 0) > 0 ? "plus" : hasMinus ? "minus" : "plus");
  const q = normalizeQuery(query);
  const shown = powers.filter((v) => {
    const p = v.power ?? 0;
    if (!q) return !(hasMinus && hasPlus) || (activeSign === "plus" ? p > 0 : p <= 0);
    const raw = p.toFixed(2);
    return q.startsWith("-") || q.startsWith("+") ? raw.replace(/^(?=\d)/, "+").startsWith(q) || raw.includes(q) : raw.replace("-", "").includes(q);
  });
  return { powers, shown, hasMinus, hasPlus, activeSign };
}

export function VariantPicker({ locale }: { locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const { variants, selectedId, selectVariant } = useBuy();
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const [query, setQuery] = useState("");
  const [sign, setSign] = useState<"minus" | "plus" | null>(null);

  const swatches = useMemo(() => buildSwatches(variants, (n) => t("variantOption", { n })), [variants, t]);
  const selectedKey = selected ? swatchKeyOf(selected) : null;
  const { powers, shown: shownPowers, hasMinus, hasPlus, activeSign } = selected
    ? visiblePowers(variants, selected, query, sign)
    : { powers: [], shown: [], hasMinus: false, hasPlus: false, activeSign: "minus" as const };

  if (variants.length < 2 || !selected) return null;

  const pick = (key: string) => {
    const same = variants.filter((v) => swatchKeyOf(v) === key && v.available);
    // keep the chosen power when the new colour has it
    const next = same.find((v) => v.power !== null && v.power === selected.power) ?? same[0];
    if (next) selectVariant(next.id);
  };

  const chosenParts = [
    swatches.length > 1 ? swatches.find((s) => s.key === selectedKey)?.label : null,
    selected.power !== null ? formatPower(locale, selected.power) : null,
  ].filter(Boolean);

  return (
    <section className={styles.variants} aria-label={t("variantTitle")} data-testid="variant-picker">
      {swatches.length > 1 ? (
        <div className={styles.variantBlock}>
          <p className={styles.variantLabel} id="variant-swatches">{selected.colour ? t("variantColour") : selected.shade ? t("variantShade") : t("variantOptions")}</p>
          <div className={styles.swatches} role="radiogroup" aria-labelledby="variant-swatches">
            {swatches.map((s) => {
              const on = s.key === selectedKey;
              const src = productCardImageSrc(s.first.image);
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={s.available ? s.label : t("variantUnavailable", { label: s.label })}
                  disabled={!s.available}
                  className={`${styles.swatch} ${on ? styles.swatchOn : ""}`}
                  onClick={() => pick(s.key)}
                  data-variant-id={s.first.id}
                >
                  {src ? <img src={src} alt="" loading="lazy" decoding="async" width={56} height={56} className={styles.swatchImg} /> : <span className={styles.swatchText}>{s.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {powers.length ? (
        <div className={styles.variantBlock}>
          <p className={styles.variantLabel} id="variant-powers">{t("variantPower")}</p>
          <div className={styles.powerTools}>
            {hasMinus && hasPlus ? (
              <Segmented
                size="sm"
                label={t("variantPower")}
                value={activeSign}
                onChange={(v) => setSign(v === "plus" ? "plus" : "minus")}
                options={[{ value: "minus", label: t("variantMinus") }, { value: "plus", label: t("variantPlus") }]}
              />
            ) : null}
            {powers.length > 12 ? (
              <div className={styles.powerSearch}>
                <Search value={query} onChange={setQuery} onClear={() => setQuery("")} clearLabel={t("variantClear")} placeholder={t("variantPowerSearchPlaceholder")} label={t("variantPowerSearch")} />
              </div>
            ) : null}
          </div>
          <div className={styles.powerGrid} role="radiogroup" aria-labelledby="variant-powers">
            {shownPowers.map((v) => {
              const label = formatPower(locale, v.power ?? 0);
              const on = v.id === selected.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={v.available ? label : t("variantUnavailable", { label })}
                  disabled={!v.available}
                  className={`${styles.power} ${on ? styles.powerOn : ""}`}
                  onClick={() => selectVariant(v.id)}
                  data-variant-id={v.id}
                >
                  <bdi dir="ltr">{label}</bdi>
                </button>
              );
            })}
          </div>
          {!shownPowers.length ? <p className={styles.variantEmpty}>{t("variantNoPower")}</p> : null}
        </div>
      ) : null}

      <p className={styles.variantChosen} role="status">{t("variantChosen", { label: chosenParts.join(" · ") })}</p>
    </section>
  );
}

/** Decision D: the gallery shows the chosen variant's own picture first (Lensme / Newlens: the colour is the picture). */
export function VariantGallery({ name, images, badge, locale, pageProductId }: { name: string; images: string[]; badge?: string; locale: string; pageProductId: string }) {
  const { product } = useBuy();
  const shown = product.id !== pageProductId && product.image ? [product.image, ...images.filter((u) => u !== product.image)] : images;
  return <ProductGallery key={product.id} name={name} images={shown} badge={badge} itemId={product.id} locale={locale} />;
}
