"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type FilterOptions = { categories: string[]; forms: string[]; brands: string[] };
const SORTS = [
  { id: "relevant", ar: "الأكثر صلة", en: "Most relevant" },
  { id: "price_asc", ar: "السعر: من الأقل للأعلى", en: "Price: low to high" },
  { id: "price_desc", ar: "السعر: من الأعلى للأقل", en: "Price: high to low" },
  { id: "newest", ar: "الأحدث إضافةً", en: "Newest" },
];

export function PharmacyFiltersClient({ options, initial, locale }: {
  options: FilterOptions;
  initial: { category: string; forms: string[]; brands: string[]; rxOnly: boolean; minPrice: string; maxPrice: string; sort: string };
  locale: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [category, setCategory] = useState(initial.category);
  const [forms, setForms] = useState<string[]>(initial.forms);
  const [brands, setBrands] = useState<string[]>(initial.brands);
  const [rxOnly, setRxOnly] = useState(initial.rxOnly);
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [sort, setSort] = useState(initial.sort);
  const [brandSearch, setBrandSearch] = useState("");

  const filteredBrands = useMemo(
    () => (brandSearch ? options.brands.filter((b) => b.includes(brandSearch)) : options.brands),
    [options.brands, brandSearch],
  );
  const activeCount = (category !== "all" ? 1 : 0) + forms.length + brands.length + (rxOnly ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }
  function reset() {
    setCategory("all"); setForms([]); setBrands([]); setRxOnly(false); setMinPrice(""); setMaxPrice(""); setSort("relevant");
  }
  function apply() {
    const q = new URLSearchParams();
    if (category !== "all") q.set("category", category);
    if (forms.length > 0) q.set("forms", forms.join(","));
    if (brands.length > 0) q.set("brands", brands.join(","));
    if (rxOnly) q.set("rx", "1");
    if (minPrice) q.set("min_price", minPrice);
    if (maxPrice) q.set("max_price", maxPrice);
    if (sort !== "relevant") q.set("sort", sort);
    const qs = q.toString();
    router.replace(`/${locale}/medicines${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h2>{ar ? "تصفية النتائج" : "Filter results"}</h2>
        {activeCount > 0 ? <span aria-label={ar ? "فلاتر نشطة" : "Active filters"}>{activeCount}</span> : null}
        <button type="button" onClick={reset}>{ar ? "إعادة تعيين" : "Reset"}</button>
      </div>
      <section aria-label={ar ? "ترتيب حسب" : "Sort by"}>
        <h3>{ar ? "ترتيب حسب" : "Sort by"}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup">
          {SORTS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={sort === s.id} onClick={() => setSort(s.id)}>{ar ? s.ar : s.en}</button>
          ))}
        </div>
      </section>
      <section aria-label={ar ? "التصنيف" : "Category"}>
        <h3>{ar ? "التصنيف" : "Category"}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup">
          {["all", ...options.categories].map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}>{c === "all" ? (ar ? "الكل" : "All") : c}</button>
          ))}
        </div>
      </section>
      <section aria-label={ar ? "وصفة طبية" : "Prescription"}>
        <label>
          <input type="checkbox" checked={rxOnly} onChange={(e) => setRxOnly(e.target.checked)} />{" "}
          {ar ? "يحتاج وصفة طبية فقط (Rx)" : "Requires prescription only (Rx)"}
        </label>
      </section>
      <section aria-label={ar ? "نطاق السعر (ر.س)" : "Price range (SAR)"}>
        <h3>{ar ? "نطاق السعر (ر.س)" : "Price range (SAR)"}</h3>
        <label>{ar ? "الحد الأدنى" : "Min"} <input type="number" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></label>{" "}
        <label>{ar ? "الحد الأقصى" : "Max"} <input type="number" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></label>
      </section>
      <section aria-label={ar ? "الشكل الدوائي" : "Dosage form"}>
        <h3>{ar ? "الشكل الدوائي" : "Dosage form"}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {options.forms.map((f) => (
            <button key={f} type="button" aria-pressed={forms.includes(f)} onClick={() => toggle(forms, f, setForms)}>{f}</button>
          ))}
        </div>
      </section>
      <section aria-label={ar ? "الشركة المصنعة" : "Manufacturer"}>
        <h3>{ar ? "الشركة المصنعة" : "Manufacturer"}</h3>
        <label>
          <span>{ar ? "ابحث عن شركة…" : "Search brands…"}</span>
          <input type="search" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filteredBrands.map((b) => (
            <button key={b} type="button" aria-pressed={brands.includes(b)} onClick={() => toggle(brands, b, setBrands)}>{b}</button>
          ))}
        </div>
      </section>
      <button type="button" onClick={apply}>{ar ? `تطبيق الفلاتر (${activeCount})` : `Apply filters (${activeCount})`}</button>
    </div>
  );
}
