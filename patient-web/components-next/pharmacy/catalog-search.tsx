"use client";

import { useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "@/components-next/ui-generated/components/Inputs";

interface Props {
  locale: string;
  /** The listing the query is sent to: the public catalogue (`c`), the medicines list or the published catalogue (`medicine-catalog`). */
  target?: "c" | "medicines" | "medicine-catalog";
  initial?: string;
  /** The barcode button (the hub's); the top bar's field has none. */
  tools?: boolean;
}

/**
 * The hub's search field. It starts as the plain field (no script cost on load); the first time it is focused the live
 * medicine suggestions (catalog-search-live.tsx) load and take its place with the same text and the caret kept.
 */
export function CatalogSearch({ locale, target = "c", initial = "", tools = true }: Props) {
  const t = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [Live, setLive] = useState<ComponentType<Props & { focusOnMount?: boolean }> | null>(null);
  const loading = useRef(false);
  if (Live) return <Live locale={locale} target={target} initial={value} tools={tools} focusOnMount />;
  const load = () => {
    if (loading.current) return;
    loading.current = true;
    void import("./catalog-search-live").then((m) => setLive(() => m.CatalogSearchLive));
  };
  return (
    <form
      role="search"
      aria-label={t("searchLabel")}
      action={`/${locale}/${target}`}
      method="get"
      onFocusCapture={load}
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(`/${locale}/${target}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
    >
      <Search
        value={value}
        onChange={setValue}
        placeholder={t("searchPlaceholder")}
        label={t("searchLabel")}
        onClear={() => setValue("")}
        clearLabel={t("clear")}
        onScanPress={tools ? () => router.push(`/${locale}/pharmacy/barcode`) : undefined}
        scanLabel={t("scan")}
      />
    </form>
  );
}
