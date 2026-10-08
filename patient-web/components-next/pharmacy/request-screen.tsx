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
import { AddressCard } from "./address-card";
import { useDeliveryAddress } from "./use-delivery-address";
import rx from "./rx.module.css";

const NAME_MIN = 3;
const NAME_MAX = 200;
const DETAILS_MAX = 500;

/**
 * The "type the names" way in of "order with a prescription" (`before` is the ways-in switch). Ask the nearby pharmacies for a medicine the catalogue does not have (the app's `request` screen). The request is created
 * and submitted (POST /patient/pharmacy/orders with `manual_request` and the saved address, then /submit), so it really
 * reaches the pharmacies; before this rebuild the web only created a draft that nobody was ever asked about.
 */
export function RequestScreen({ locale, before }: { locale: Locale; before?: ReactNode }) {
  const t = useTranslations("PharmacyRequest");
  const rxT = useTranslations("RxUpload");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const address = useDeliveryAddress(true);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<"session" | "send" | null>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const valid = name.trim().length >= NAME_MIN;
  const canSend = valid && address.status === "ready";

  async function send() {
    if (!canSend || sending || address.status !== "ready") return;
    setSending(true);
    setFailure(null);
    const signature = `${name.trim()}|${details.trim()}|${address.address.id}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: newIdempotencyKey() };
    const result = await sendBroadcast({ kind: "manual", name, details }, address.address, attempt.current.key);
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
