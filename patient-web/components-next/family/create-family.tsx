"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

const FAMILY = SERVICE_ICONS.family;

/**
 * The hub when the patient has no family group yet (F70): the board's empty state with "Create group" (POST /api/family/create,
 * with the default group name like the app) and "Join an existing family" (the join tab of the add screen).
 */
export function CreateFamily() {
  const t = useTranslations("FamilyWeb");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function create() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/family/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: t("defaultName") }) });
      if (res.ok) router.refresh();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={rx.state}>
      <EmptyState icon={FAMILY.icon} tone={FAMILY.tone} title={t("noGroupTitle")} body={t("noGroupBody")} />
      <Button label={busy ? t("creating") : t("createGroup")} size="lg" fullWidth loading={busy} onClick={() => void create()} />
      <ButtonLink href={`/${locale}/family/add?tab=join`} label={t("joinExisting")} variant="outline" fullWidth />
      {failed ? <p className={forms.error} role="alert">{t("createFailed")}</p> : null}
    </div>
  );
}
