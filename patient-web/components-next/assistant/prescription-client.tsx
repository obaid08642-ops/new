"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { Notice } from "@/components-next/consult/consult-parts";
import rx from "@/components-next/pharmacy/rx.module.css";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { MAX_RX_FILE_BYTES, checkRxFile, ocrItems, prepareRxImage, type RxItem } from "@/lib/pharmacy/rx-upload";
import { AnswerCard } from "./assistant-kit";
import styles from "./assistant.module.css";

type Failure = "type" | "size" | "read" | "unreadable" | "ocr";
type Phase = { kind: "idle" } | { kind: "preparing" } | { kind: "reading" } | { kind: "failed"; reason: Failure } | { kind: "answered"; items: RxItem[] };

/**
 * Mode 2, "explain my prescription / medicine": the photo goes to POST /api/patient/ai/prescription-ocr (the call the old
 * translator and the prescription upload make) and the medicines it read are listed, each with the quantity the server read.
 * The endpoint returns names and quantities only, so there is no leaflet text to draw (Needs review); the way on is the
 * pharmacist chat. Nothing is saved: the photo is not stored by this mode.
 */
export function PrescriptionClient() {
  const t = useTranslations("AssistantWeb");
  const rxText = useTranslations("RxUpload");
  const locale = useLocale();
  const cameraRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = phase.kind === "preparing" || phase.kind === "reading";
  const megabytes = new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", unitDisplay: "short" }).format(MAX_RX_FILE_BYTES / (1024 * 1024));
  const number = new Intl.NumberFormat(locale);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const check = checkRxFile(chosen);
    if (check !== "ok") return setPhase({ kind: "failed", reason: check });
    setPhase({ kind: "preparing" });
    let prepared: string;
    try {
      prepared = await prepareRxImage(chosen);
    } catch {
      return setPhase({ kind: "failed", reason: "read" });
    }
    setImage(prepared);
    setPhase({ kind: "reading" });
    try {
      const response = await fetch("/api/patient/ai/prescription-ocr", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify({ image_base64: prepared }),
      });
      if (!response.ok) return setPhase({ kind: "failed", reason: "ocr" });
      const items = ocrItems(await response.json().catch(() => null));
      setPhase(items.length > 0 ? { kind: "answered", items } : { kind: "failed", reason: "unreadable" });
    } catch {
      setPhase({ kind: "failed", reason: "ocr" });
    }
  }

  function again() {
    setImage(null);
    setPhase({ kind: "idle" });
  }

  const errors: Record<Failure, string> = {
    type: rxText("errorType"),
    size: rxText("errorSize", { size: megabytes }),
    read: rxText("errorRead"),
    unreadable: rxText("errorUnreadable"),
    ocr: rxText("errorOcr"),
  };

  return (
    <div className={styles.thread}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden aria-label={rxText("cameraInput")} onChange={(event) => void pick(event)} />
      <input ref={photosRef} type="file" accept="image/*" hidden aria-label={rxText("photosInput")} onChange={(event) => void pick(event)} />

      {phase.kind === "answered" ? null : (
        <section className={rx.drop}>
          <FIcon icon="prescription" tone={PHARMACY_TONE} size={72} />
          <h2 className={rx.dropTitle}>{rxText("dropTitle")}</h2>
          <p className={rx.dropHint}>{rxText("dropHint")}</p>
          <div className={rx.dropButtons}>
            <Button label={rxText("camera")} startIcon="camera" size="md" disabled={busy} onClick={() => cameraRef.current?.click()} />
            <Button label={rxText("photos")} startIcon="image" variant="outline" size="md" disabled={busy} onClick={() => photosRef.current?.click()} />
          </div>
        </section>
      )}

      {image && phase.kind !== "idle" ? (
        <div className={rx.attachments}>
          <div className={rx.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen photo (a data: URL) */}
            <img className={rx.thumbImage} src={image} alt={rxText("previewAlt")} />
          </div>
        </div>
      ) : null}
      {busy ? <p role="status" className={rx.status}>{phase.kind === "preparing" ? rxText("stagePreparing") : rxText("stageReading")}</p> : null}
      {phase.kind === "failed" ? <div role="alert"><Notice warn>{errors[phase.reason]}</Notice></div> : null}

      {phase.kind === "answered" ? (
        <AnswerCard
          icon="pill"
          tone={PHARMACY_TONE}
          title={t("medicinesTitle")}
          disclaimer={t("disclaimer")}
          actions={
            <>
              <ButtonLink href={`/${locale}/pharmacy/chat`} label={t("askPharmacist")} />
              <Button label={t("explainAnother")} variant="ghost" onClick={again} />
            </>
          }
        >
          <ul className={styles.medicines}>
            {phase.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className={styles.medicine}>
                <span className={styles.medicineName} dir="auto">{item.name}</span>
                <span className={styles.medicineQty}>{rxText("quantityValue", { qty: number.format(item.quantity) })}</span>
              </li>
            ))}
          </ul>
          <p className={styles.answerBody}>{t("pharmacistNote")}</p>
        </AnswerCard>
      ) : null}
    </div>
  );
}
