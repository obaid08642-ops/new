"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { newIdempotencyKey, sendBroadcast } from "@/lib/pharmacy/broadcast";
import { checkRxFile, prepareRxImage } from "@/lib/pharmacy/rx-upload";
import { AddressCard } from "./address-card";
import { useDeliveryAddress } from "./use-delivery-address";
import rx from "./rx.module.css";
import { UploadsUnavailable, useUploadsEnabled } from "@/components-next/uploads/uploads-provider";

const NAME_MIN = 3;
const NAME_MAX = 200;
const DETAILS_MAX = 500;

/**
 * The "type the names" way in of "order with a prescription" (`before` is the ways-in switch). Ask the nearby pharmacies for a medicine the catalogue does not have (the app's `request` screen). The request is created
 * and submitted (POST /patient/pharmacy/orders with `manual_request` and the saved address, then /submit), so it really
 * reaches the pharmacies; before this rebuild the web only created a draft that nobody was ever asked about.
 */
export function RequestScreen({ locale, before, initialName = "" }: { locale: Locale; before?: ReactNode; initialName?: string }) {
  const uploadsEnabled = useUploadsEnabled();
  const t = useTranslations("PharmacyRequest");
  const rxT = useTranslations("RxUpload");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const address = useDeliveryAddress(true);
  const [name, setName] = useState(initialName);
  const [details, setDetails] = useState("");
  // journeys 74 (decision 12): how many boxes, and a photo of the box
  const [qty, setQty] = useState("1");
  const [photo, setPhoto] = useState<{ id: string; preview: string } | null>(null);
  const [photoState, setPhotoState] = useState<"idle" | "uploading" | "failed" | "type">("idle");
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<"session" | "send" | null>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const qtyNumber = Number(qty);
  const qtyValid = Number.isInteger(qtyNumber) && qtyNumber >= 1 && qtyNumber <= 99;
  const valid = name.trim().length >= NAME_MIN && qtyValid && photoState !== "uploading";

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (checkRxFile(file) !== "ok") { setPhotoState("type"); return; }
    setPhotoState("uploading");
    try {
      const dataUrl = await prepareRxImage(file);
      const response = await fetch("/api/pharmacy/box-photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data_url: dataUrl }), credentials: "same-origin" });
      const body = await response.json().catch(() => null) as { id?: string } | null;
      if (!response.ok || !body?.id) { setPhotoState("failed"); return; }
      setPhoto({ id: body.id, preview: dataUrl });
      setPhotoState("idle");
    } catch {
      setPhotoState("failed");
    }
  }
  const canSend = valid && address.status === "ready";

  async function send() {
    if (!canSend || sending || address.status !== "ready") return;
    setSending(true);
    setFailure(null);
    const signature = `${name.trim()}|${details.trim()}|${qtyNumber}|${photo?.id ?? ""}|${address.address.id}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: newIdempotencyKey() };
    const result = await sendBroadcast({ kind: "manual", name, details, qty: qtyNumber, photoId: photo?.id }, address.address, attempt.current.key);
    if (result.ok) return router.push(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(result.orderId)}`);
    setSending(false);
    setFailure(result.reason === "unauthenticated" ? "session" : "send");
  }

  const sendButton = <Button label={sending ? t("submitting") : t("submit")} size="lg" fullWidth disabled={!canSend} loading={sending} onClick={() => void send()} />;

  return (
    <CoreShell
      locale={locale}
      title={t("title")}
      backHref={`/${locale}/c`}
      hideTabs
      width="narrow"
      footer={<StickyFooter label={t("title")}><div className={rx.bar}>{sendButton}</div></StickyFooter>}
    >
      <form
        className={rx.page}
        aria-label={t("title")}
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {before}
        <p className={rx.lead}>{t("subtitle")}</p>

        <Input label={t("name")} placeholder={t("namePh")} hint={t("nameHint")} value={name} disabled={sending} onChange={(value) => setName(value.slice(0, NAME_MAX))} />
        <Input
          label={`${t("details")} ${t("optional")}`}
          placeholder={t("detailsPh")}
          value={details}
          multiline
          rows={3}
          disabled={sending}
          onChange={(value) => setDetails(value.slice(0, DETAILS_MAX))}
        />

        <Input label={t("qty")} value={qty} disabled={sending} keyboardType="number" error={qty && !qtyValid ? t("qtyInvalid") : undefined} onChange={(value) => setQty(value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, "").slice(0, 2))} />
        <div className={rx.field}>
          <span className={rx.cardLabel}>{`${t("photo")} ${t("optional")}`}</span>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label={t("photo")} onChange={(event) => void pickPhoto(event.target.files?.[0])} />
          {photo ? <div className={rx.thumb}><img src={photo.preview} alt={t("photoAlt")} className={rx.thumbImage} /></div> : null}
          {uploadsEnabled ? (
            <Button type="button" variant="outline" size="md" label={photoState === "uploading" ? t("photoUploading") : photo ? t("photoChange") : t("photoAdd")} loading={photoState === "uploading"} disabled={sending} onClick={() => photoInput.current?.click()} />
          ) : <UploadsUnavailable className={rx.note} />}
          {photoState === "failed" || photoState === "type" ? <p className={rx.note} role="alert">{photoState === "type" ? t("photoType") : t("photoFailed")}</p> : null}
        </div>

        <AddressCard locale={locale} state={address} />
        <p className={rx.note}>{rxT("sendNote")}</p>

        {failure ? (
          <div className={rx.error} role="alert">
            {failure === "session" ? flow("sessionEnded") : t("error")}
            {failure === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
          </div>
        ) : null}

        <div className={rx.deskActions}>{sendButton}</div>
      </form>
    </CoreShell>
  );
}
