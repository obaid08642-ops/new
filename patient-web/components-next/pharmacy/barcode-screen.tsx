"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { DrugInteractionChecker } from "@/components-next/drug-interaction-checker";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { formatPrice } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import { cleanBarcode, parseBarcodeLookup, type BarcodeMatch } from "@/lib/pharmacy/barcode";
import { ButtonLink } from "./button-link";
import { PHARMACY_TONE } from "./tones";
import rx from "./rx.module.css";

type Outcome =
  | { kind: "idle" }
  | { kind: "looking" }
  | { kind: "found"; match: BarcodeMatch; code: string }
  | { kind: "missing"; code: string }
  | { kind: "failed"; reason: "lookup" | "session" };

/**
 * Scan a medicine (second pass, section 3: the old barcode and drug-interaction pages in one screen). Find a medicine by the barcode on its package (the app's barcode scanner, typed in: the web has no camera scan, so this
 * screen does not promise one). An exact match is shown as found; a name match on the typed text is shown as the closest
 * match, never as a recognised barcode.
 */
export function BarcodeScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("PharmacyBarcode");
  const flow = useTranslations("PharmacyFlow");
  const browse = useTranslations("PharmacyBrowse");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const looking = outcome.kind === "looking";
  const clean = cleanBarcode(code);

  async function lookup() {
    if (!clean || looking) return;
    setOutcome({ kind: "looking" });
    try {
      const response = await fetch(`/api/patient/medicines/by-barcode/${encodeURIComponent(clean)}`, { cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) return setOutcome({ kind: "failed", reason: "session" });
      if (!response.ok) return setOutcome({ kind: "failed", reason: "lookup" });
      const match = parseBarcodeLookup(await response.json().catch(() => null), locale);
      setOutcome(match ? { kind: "found", match, code: clean } : { kind: "missing", code: clean });
    } catch {
      setOutcome({ kind: "failed", reason: "lookup" });
    }
  }

  function reset() {
    setCode("");
    setOutcome({ kind: "idle" });
  }

  const found = outcome.kind === "found" ? outcome.match : null;
  const product = found?.medicine;
  const meta = product ? [product.form, product.strength, product.manufacturer].filter(Boolean).join(" · ") : "";
  const price = product?.price !== undefined ? formatPrice(locale, product.price).text : null;

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/c`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        <p className={rx.lead}>{t("intro")}</p>

        <form
          className={rx.lookup}
          aria-label={t("title")}
          onSubmit={(event) => {
            event.preventDefault();
            void lookup();
          }}
        >
          <Input label={t("codeLabel")} placeholder={t("codePlaceholder")} value={code} disabled={looking} onChange={(value) => setCode(value.slice(0, 64))} />
          <Button label={looking ? t("looking") : t("lookup")} type="submit" size="lg" disabled={!clean} loading={looking} />
        </form>

        {outcome.kind === "failed" ? (
          <div className={rx.error} role="alert">
            {outcome.reason === "session" ? flow("sessionEnded") : t("errorLookup")}
            {outcome.reason === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
          </div>
        ) : null}

        {found && product && outcome.kind === "found" ? (
          <section className={`${rx.card} ${rx.result}`} aria-label={found.kind === "exact" ? t("foundTitle") : t("closestTitle")}>
            <div className={rx.chips}>
              <StatusChip label={found.kind === "exact" ? t("foundTitle") : t("closestTitle")} tone={found.kind === "exact" ? "mint" : "amber"} />
              {product.requiresRx ? <StatusChip label={t("needsRx")} tone="amber" /> : null}
              {product.onlineOnly ? <StatusChip label={t("onlineOnly")} tone="mint" /> : null}
            </div>
            <div className={rx.resultHead}>
              <FIcon icon="pill" tone={PHARMACY_TONE} size={48} />
              <div className={rx.cardBody}>
                <h2 className={rx.rowTitle}>{product.name}</h2>
                {meta ? <span className={rx.rowSub}>{meta}</span> : null}
              </div>
            </div>
            {found.kind === "closest" ? <p className={rx.note}>{t("closestNote")}</p> : null}
            <span className={rx.price}>{price ?? t("priceUnavailable")}</span>
            <span className={rx.note}>{t("barcodeLine", { code: outcome.code })}</span>
            <div className={rx.actionsStack}>
              <ButtonLink href={`/${locale}/${product.slug ? `p/${encodeURIComponent(product.slug)}` : `medicines/${encodeURIComponent(product.id)}`}`} label={t("viewProduct")} fullWidth />
              <Button label={t("another")} variant="outline" size="lg" fullWidth onClick={reset} />
            </div>
          </section>
        ) : null}

        {outcome.kind === "missing" ? (
          <section className={`${rx.card} ${rx.result}`} aria-label={t("notFoundTitle")}>
            <h2 className={rx.h2}>{t("notFoundTitle")}</h2>
            <p className={rx.note} role="status">{t("notFoundBody", { code: outcome.code })}</p>
            <div className={rx.actionsStack}>
              <ButtonLink href={`/${locale}/pharmacy/rx-order?via=type`} label={t("requestByName")} fullWidth />
              <Button label={t("another")} variant="outline" size="lg" fullWidth onClick={reset} />
            </div>
          </section>
        ) : null}

        <section className={rx.card} aria-labelledby="scan-ix">
          <h2 className={rx.h2} id="scan-ix">{browse("ixTitle")}</h2>
          <DrugInteractionChecker key={product?.id ?? "none"} locale={locale} initialDrugs={product?.name ? [product.name] : []} />
        </section>
      </div>
    </CoreShell>
  );
}
