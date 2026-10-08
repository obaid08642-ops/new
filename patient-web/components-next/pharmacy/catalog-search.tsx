"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "@/components-next/ui-generated/components/Inputs";

/**
 * The hub's search field (canvas/PharmacyHub: the 52 tall field, the ink filter square and the barcode button inside).
 * Submitting goes to the catalogue's own search URL; the barcode button opens "scan a medicine". The categories are the chips under the field (the old filters page is a redirect to them).
 */
export function CatalogSearch({
  locale,
  target = "c",
  initial = "",
  tools = true,
}: {
  locale: string;
  /** The listing the query is sent to: the public catalogue (`c`) or the medicines list. */
  target?: "c" | "medicines";
  initial?: string;
  /** The barcode button (the hub's); the top bar's field has none. */
  tools?: boolean;
}) {
  const t = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  return (
    <form
      role="search"
      aria-label={t("searchLabel")}
      action={`/${locale}/${target}`}
      method="get"
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
