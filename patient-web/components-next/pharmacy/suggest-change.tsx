"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input, Select } from "@/components-next/ui-generated/components/Inputs";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import styles from "./product-detail.module.css";

const TYPES = ["field_edit", "image_remove", "shortage", "duplicate", "other"] as const;
/** The backend field of a field edit and the message that names it. */
const FIELDS = [
  ["description", "suggestFieldDescription"],
  ["active_ingredient", "suggestFieldIngredient"],
  ["usage", "suggestFieldUsage"],
  ["dosage", "suggestFieldDosage"],
  ["manufacturer", "suggestFieldMaker"],
  ["name", "suggestFieldName"],
] as const;
type SuggestionType = (typeof TYPES)[number];
type SuggestionField = (typeof FIELDS)[number][0];
type Phase = "idle" | "sending" | "sent" | "failed" | "signedOut";

const TYPE_KEY = { field_edit: "suggestFieldEdit", image_remove: "suggestImageRemove", shortage: "suggestShortage", duplicate: "suggestDuplicate", other: "suggestOther" } as const satisfies Record<SuggestionType, string>;

/**
 * "Suggest an edit" of the product page (the app's suggestion sheet): POST /medicines/:id/suggest-change with the kind of
 * change, the corrected value for a field edit and an optional note. It goes to management for approval; nothing on the page
 * changes. A visitor who is not signed in is sent to sign in (the site's proxy needs a session).
 */
export function SuggestChange({ medicineId, locale }: { medicineId: string; locale: string }) {
  const t = useTranslations("PublicProduct");
  const [type, setType] = useState<SuggestionType>("field_edit");
  const [field, setField] = useState<SuggestionField>("description");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const key = useRef(newIdempotencyKey());

  async function send() {
    if (phase === "sending") return;
    if (type === "field_edit" && !value.trim()) return setMissing(true);
    setMissing(false);
    setPhase("sending");
    try {
      const response = await fetch(`/api/patient/medicines/${encodeURIComponent(medicineId)}/suggest-change`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": key.current },
        body: JSON.stringify({ type, changes: type === "field_edit" ? { [field]: value.trim() } : {}, note: note.trim() || undefined }),
      });
      if (response.status === 401) return setPhase("signedOut");
      if (!response.ok) return setPhase("failed");
      setPhase("sent");
      setValue("");
      setNote("");
      key.current = newIdempotencyKey();
    } catch {
      setPhase("failed");
    }
  }

  return (
    <div className={styles.suggest}>
      <button type="button" className={styles.suggestSummary} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{t("suggestTitle")}</button>
      {open ? <div className={styles.suggestBody}>
        <Select label={t("suggestTypeLabel")} value={type} onChange={(next) => setType(TYPES.find((entry) => entry === next) ?? "field_edit")} options={TYPES.map((entry) => ({ value: entry, label: t(TYPE_KEY[entry]) }))} disabled={phase === "sending"} />
        {type === "field_edit" ? (
          <>
            <Select label={t("suggestFieldLabel")} value={field} onChange={(next) => setField(FIELDS.find(([entry]) => entry === next)?.[0] ?? "description")} options={FIELDS.map(([entry, label]) => ({ value: entry, label: t(label) }))} disabled={phase === "sending"} />
            <Input label={t("suggestValuePlaceholder")} value={value} multiline rows={3} disabled={phase === "sending"} error={missing ? t("suggestValueRequired") : undefined} onChange={(next) => setValue(next.slice(0, 1000))} />
          </>
        ) : null}
        <Input label={t("suggestNotePlaceholder")} value={note} multiline rows={2} disabled={phase === "sending"} onChange={(next) => setNote(next.slice(0, 500))} />
        <Button label={phase === "sending" ? t("suggestSending") : t("suggestSend")} size="md" loading={phase === "sending"} onClick={() => void send()} />
        {phase === "sent" ? <p role="status" className={styles.suggestOk}><strong>{t("suggestSentTitle")}</strong> {t("suggestSentBody")}</p> : null}
        {phase === "failed" ? <p role="alert" className={styles.wishlistError}><strong>{t("suggestFailTitle")}</strong> {t("suggestFailBody")}</p> : null}
        {phase === "signedOut" ? <p role="alert" className={styles.wishlistError}>{t("suggestSignIn")} <Link href={`/${locale}/login`}>{t("suggestSignInAction")}</Link></p> : null}
      </div> : null}
    </div>
  );
}
