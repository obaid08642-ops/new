"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { DrugInteractionChecker } from "@/components-next/drug-interaction-checker";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { formatPrice } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { parseScanAnswer, type ScanMedicine } from "@/lib/pharmacy/ai-scan";
import { MAX_RX_FILE_BYTES, checkRxFile, prepareRxImage } from "@/lib/pharmacy/rx-upload";
import { ButtonLink } from "./button-link";
import { PHARMACY_TONE } from "./tones";
import rx from "./rx.module.css";

type Failure = "type" | "size" | "read" | "unreadable" | "rxUnreadable" | "busy" | "scan" | "session";
type Phase =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "matches"; readAs: string | null; medicines: ScanMedicine[] }
  | { kind: "opening" }
  | { kind: "failed"; reason: Failure };

/**
 * The AI scanner (decision 36, changed 2026-10-16; it replaces the BarcodeDetector camera, the catalogue has no barcodes).
 * The patient takes or chooses one photo of a medicine pack, its barcode or QR code, or a prescription. POST /ai/scan reads
 * it with the vision model: for a pack, barcode or QR it answers with the closest public-catalogue medicines, which the
 * patient picks from; a prescription goes through the normal prescription flow on the server (read, then saved with the
 * photo for the pharmacist's review) and this screen opens the prescription order. The interaction check stays below.
 */
export function BarcodeScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("PharmacyBarcode");
  const flow = useTranslations("PharmacyFlow");
  const browse = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = phase.kind === "reading" || phase.kind === "opening";

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen || busy) return;
    const check = checkRxFile(chosen);
    if (check !== "ok") return setPhase({ kind: "failed", reason: check });
    setPhase({ kind: "reading" });
    let image: string;
    try {
      image = await prepareRxImage(chosen);
    } catch {
      return setPhase({ kind: "failed", reason: "read" });
    }
    try {
      const response = await fetch("/api/patient/ai/scan", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify({ image_base64: image }),
      });
      if (response.status === 401) return setPhase({ kind: "failed", reason: "session" });
      if (response.status === 429) return setPhase({ kind: "failed", reason: "busy" });
      if (response.status === 422) return setPhase({ kind: "failed", reason: "unreadable" });
      if (!response.ok) return setPhase({ kind: "failed", reason: "scan" });
      const outcome = parseScanAnswer(await response.json().catch(() => null), locale);
      if (!outcome) return setPhase({ kind: "failed", reason: "scan" });
      if (outcome.kind === "prescriptionUnreadable") return setPhase({ kind: "failed", reason: "rxUnreadable" });
      if (outcome.kind === "prescription") {
        setPhase({ kind: "opening" });
        router.push(`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(outcome.prescriptionId)}`);
        return;
      }
      setPhase({ kind: "matches", readAs: outcome.readAs, medicines: outcome.medicines });
    } catch {
      setPhase({ kind: "failed", reason: "scan" });
    }
  }

  const megabytes = new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", unitDisplay: "short" }).format(MAX_RX_FILE_BYTES / (1024 * 1024));
  const errorText: Record<Failure, string> = {
    type: t("errorType"),
    size: t("errorSize", { size: megabytes }),
    read: t("errorRead"),
    unreadable: t("errorUnreadable"),
    rxUnreadable: t("errorRxUnreadable"),
    busy: t("errorBusy"),
    scan: t("errorScan"),
    session: flow("sessionEnded"),
  };
  const failure = phase.kind === "failed" ? phase.reason : null;
  const productHref = (medicine: ScanMedicine) => `/${locale}/${medicine.slug ? `p/${encodeURIComponent(medicine.slug)}` : `medicines/${encodeURIComponent(medicine.id)}`}`;

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/c`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        <p className={rx.lead}>{t("intro")}</p>

        <input ref={input} className={rx.srOnly} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" tabIndex={-1} aria-hidden="true" onChange={(event) => void pick(event)} />
        <Button
          type="button"
          size="lg"
          fullWidth
          startIcon="scan"
          label={busy ? t("reading") : phase.kind === "idle" ? t("takePhoto") : t("another")}
          loading={busy}
          disabled={busy}
          onClick={() => input.current?.click()}
        />
        {phase.kind === "reading" ? <p className={rx.note} role="status">{t("reading")}</p> : null}
        {phase.kind === "opening" ? <p className={rx.note} role="status">{t("rxSaved")}</p> : null}

        {failure ? (
          <div className={rx.error} role="alert">
            {errorText[failure]}
            {failure === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
            {failure === "rxUnreadable" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/pharmacy/rx-order?via=photo`}>{t("uploadRx")}</Link></div> : null}
          </div>
        ) : null}

        {phase.kind === "matches" && phase.medicines.length > 0 ? (
          <section className={`${rx.card} ${rx.result}`} aria-labelledby="scan-matches">
            <h2 className={rx.h2} id="scan-matches">{t("matchesTitle")}</h2>
            {phase.readAs ? <p className={rx.note}>{t("matchesNote", { name: phase.readAs })}</p> : null}
            <ul className={rx.list}>
              {phase.medicines.map((medicine) => (
                <li key={medicine.id}>
                  <Link className={`${rx.listRow} ${rx.rowLink}`} href={productHref(medicine)}>
                    <FIcon icon="pill" tone={PHARMACY_TONE} size={40} />
                    <span className={rx.rowBody}>
                      <span className={rx.rowTitle}>{medicine.name}</span>
                      {medicine.meta ? <span className={rx.rowSub}>{medicine.meta}</span> : null}
                      <span className={rx.rowSub}>{medicine.price !== undefined ? formatPrice(locale, medicine.price).text : t("priceUnavailable")}</span>
                      {medicine.requiresRx || medicine.onlineOnly ? (
                        <span className={rx.chips}>
                          {medicine.requiresRx ? <StatusChip label={t("needsRx")} tone="amber" /> : null}
                          {medicine.onlineOnly ? <StatusChip label={t("onlineOnly")} tone="mint" /> : null}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {phase.kind === "matches" && phase.medicines.length === 0 ? (
          <section className={`${rx.card} ${rx.result}`} aria-label={t("noneTitle")}>
            <h2 className={rx.h2}>{t("noneTitle")}</h2>
            <p className={rx.note} role="status">{t("noneBody")}</p>
            <div className={rx.actionsStack}>
              <ButtonLink href={`/${locale}/pharmacy/rx-order?via=type`} label={t("requestByName")} fullWidth />
            </div>
          </section>
        ) : null}

        <section className={rx.card} aria-labelledby="scan-ix">
          <h2 className={rx.h2} id="scan-ix">{browse("ixTitle")}</h2>
          <DrugInteractionChecker locale={locale} />
        </section>
      </div>
    </CoreShell>
  );
}
