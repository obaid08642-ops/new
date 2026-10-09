"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { MAX_RX_FILE_BYTES, checkRxFile, ocrItems, postJsonWithProgress, prepareRxImage, uploadedPrescriptionId } from "@/lib/pharmacy/rx-upload";
import { PHARMACY_TONE } from "./tones";
import rx from "./rx.module.css";

type Failure = "type" | "size" | "read" | "unreadable" | "ocr" | "save" | "session";
type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "reading" }
  | { kind: "saving"; fraction: number | null }
  | { kind: "failed"; reason: Failure };

const NOTE_MAX = 500;

/**
 * The photo and upload ways in of "order with a prescription" (canvas/RxUpload; `before` is the ways-in switch and `after` the
 * patient's active prescriptions). One photo, read by the OCR (POST /ai/prescription-ocr) and saved for the
 * pharmacist (POST /prescriptions/upload); then the patient orders from it (/pharmacy/rx-order). The stages and the
 * progress shown are the real ones: what the server answered, and the bytes the browser has sent.
 */
export function RxUploadScreen({ locale, via = "photo", before, after }: { locale: Locale; via?: "photo" | "upload"; before?: ReactNode; after?: ReactNode }) {
  const t = useTranslations("RxUpload");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  // the chosen photo, already scaled. A data: URL, because the page's CSP allows data: images and not blob: ones;
  // it is both the preview and what is sent.
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // the key of the last save attempt: the same request retried keeps its key, so a dropped connection never saves twice
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const busy = phase.kind === "preparing" || phase.kind === "reading" || phase.kind === "saving";
  const failure = phase.kind === "failed" ? phase.reason : null;

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const check = checkRxFile(chosen);
    if (check !== "ok") {
      setPhase({ kind: "failed", reason: check });
      return;
    }
    setPhase({ kind: "preparing" });
    try {
      setImage(await prepareRxImage(chosen));
      setPhase({ kind: "idle" });
    } catch {
      setPhase({ kind: "failed", reason: "read" });
    }
  }

  function clear() {
    setImage(null);
    setPhase({ kind: "idle" });
  }

  async function submit() {
    if (!image || busy) return;
    setPhase({ kind: "reading" });
    let items;
    try {
      const response = await fetch("/api/patient/ai/prescription-ocr", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        body: JSON.stringify({ image_base64: image }),
      });
      if (response.status === 401) return setPhase({ kind: "failed", reason: "session" });
      if (!response.ok) return setPhase({ kind: "failed", reason: "ocr" });
      items = ocrItems(await response.json().catch(() => null));
    } catch {
      return setPhase({ kind: "failed", reason: "ocr" });
    }
    if (items.length === 0) return setPhase({ kind: "failed", reason: "unreadable" });

    const trimmedNote = note.trim();
    const signature = `${image.length}:${image.slice(-48)}:${items.map((item) => `${item.name}*${item.quantity}`).join("|")}:${trimmedNote}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: newIdempotencyKey() };

    setPhase({ kind: "saving", fraction: null });
    try {
      const saved = await postJsonWithProgress(
        "/api/patient/prescriptions/upload",
        { "idempotency-key": attempt.current.key },
        { upload_image: image, items, ...(trimmedNote ? { notes: trimmedNote } : {}) },
        (fraction) => setPhase({ kind: "saving", fraction }),
      );
      if (saved.status === 401) return setPhase({ kind: "failed", reason: "session" });
      const id = saved.status >= 200 && saved.status < 300 ? uploadedPrescriptionId(saved.body) : null;
      if (!id) return setPhase({ kind: "failed", reason: "save" });
      router.push(`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(id)}`);
    } catch {
      setPhase({ kind: "failed", reason: "save" });
    }
  }

  const percent = (fraction: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(fraction);
  const megabytes = new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", unitDisplay: "short" }).format(MAX_RX_FILE_BYTES / (1024 * 1024));

  const errorText: Record<Failure, string> = {
    type: t("errorType"),
    size: t("errorSize", { size: megabytes }),
    read: t("errorRead"),
    unreadable: t("errorUnreadable"),
    ocr: t("errorOcr"),
    save: t("errorSave"),
    session: flow("sessionEnded"),
  };

  const submitButton = (
    <Button label={t("submit")} size="lg" fullWidth disabled={!image} loading={busy} onClick={() => void submit()} />
  );

  return (
    <CoreShell
      locale={locale}
      title={t("title")}
      backHref={`/${locale}/c`}
      hideTabs
      width="narrow"
      footer={<StickyFooter label={t("title")}><div className={rx.bar}>{submitButton}</div></StickyFooter>}
    >
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {before}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden aria-label={t("cameraInput")} onChange={(event) => void pick(event)} />
        <input ref={photosRef} type="file" accept="image/*" hidden aria-label={t("photosInput")} onChange={(event) => void pick(event)} />

        <section className={rx.drop}>
          <FIcon icon="prescription" tone={PHARMACY_TONE} size={72} />
          <h2 className={rx.dropTitle}>{t("dropTitle")}</h2>
          <p className={rx.dropHint}>{t("dropHint")}</p>
          <div className={rx.dropButtons}>
            {via === "photo" ? <Button label={t("camera")} startIcon="camera" size="md" disabled={busy} onClick={() => cameraRef.current?.click()} /> : null}
            {via === "upload" ? <Button label={t("photos")} startIcon="image" size="md" disabled={busy} onClick={() => photosRef.current?.click()} /> : null}
          </div>
        </section>

        {image ? (
          <section aria-labelledby="rx-attachment">
            <h2 className={rx.h2} id="rx-attachment">{t("attachment")}</h2>
            <div className={rx.attachments}>
              <div className={rx.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen photo (a data: URL) */}
                <img className={rx.thumbImage} src={image} alt={t("previewAlt")} />
                <button type="button" className={rx.thumbRemove} aria-label={t("removePhoto")} onClick={clear} disabled={busy}>
                  <Icon name="close" size={16} tone="primary" />
                </button>
              </div>
              <p className={rx.note}>{t("oneNote")}</p>
            </div>
          </section>
        ) : null}

        <div className={rx.field}>
          <Input
            label={`${t("noteLabel")} ${t("optional")}`}
            placeholder={t("notePlaceholder")}
            value={note}
            multiline
            rows={3}
            disabled={busy}
            onChange={(value) => setNote(value.slice(0, NOTE_MAX))}
          />
        </div>

        {busy ? (
          <div className={rx.progress}>
            <p role="status" className={rx.status}>
              {phase.kind === "preparing" ? t("stagePreparing") : phase.kind === "reading" ? t("stageReading") : phase.kind === "saving" && phase.fraction !== null ? t("stageSaving", { percent: percent(phase.fraction) }) : t("stageSaving", { percent: percent(0) })}
            </p>
            {phase.kind === "saving" && phase.fraction !== null ? (
              <progress className={rx.progressBar} value={phase.fraction} max={1} aria-label={t("progressLabel")} />
            ) : (
              <progress className={rx.progressBar} aria-label={t("progressLabel")} />
            )}
          </div>
        ) : null}

        {failure ? (
          <div className={rx.error} role="alert">
            {errorText[failure]}
            <div className={rx.errorActions}>
              {failure === "unreadable" || failure === "ocr" ? <Link className={rx.textLink} href={`/${locale}/pharmacy/rx-order?via=type`}>{t("addByName")}</Link> : null}
              {failure === "session" ? <Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link> : null}
            </div>
          </div>
        ) : null}

        <div className={rx.deskActions}>{submitButton}</div>
        {after}
      </div>
    </CoreShell>
  );
}
