"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ChoiceGroup, TextField } from "@/components-next/care/care-fields";
import { Notice } from "@/components-next/consult/consult-parts";
import forms from "@/components-next/consult/consult.module.css";

/**
 * The maternity profile form (canvas/CareHub setup): the cycle path or the pregnancy path, then POST /api/patient/maternity/profile
 * with the same payload as before (the date fields are date inputs, which give the same YYYY-MM-DD).
 */
export function MaternitySetupClient({ locale }: { locale: string }) {
  const t = useTranslations("MaternityWeb");
  const router = useRouter();
  const [mode, setMode] = useState<"cycle" | "pregnancy">("cycle");
  const [lmp, setLmp] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [regular, setRegular] = useState<"true" | "false">("true");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!lmp.trim() || (mode === "cycle" && !cycleLength.trim())) {
      setError(t("setupRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = mode === "pregnancy"
        ? { is_pregnant: true, lmp_date: lmp.trim(), ...(dueDate.trim() ? { due_date: dueDate.trim() } : {}) }
        : { is_pregnant: false, last_period_date: lmp.trim(), cycle_length: Number(cycleLength), is_regular: regular === "true" };
      const res = await fetch("/api/patient/maternity/profile", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-maternity-${Date.now()}` },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      if (!res.ok) {
        setError(t("setupFailed"));
        return;
      }
      router.replace(`/${locale}/maternity`);
    } catch {
      setError(t("connectionFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={forms.stack} noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <ChoiceGroup
        label={t("setupPath")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "cycle", label: t("modeCycle") },
          { value: "pregnancy", label: t("modePregnancy") },
        ]}
      />
      <p className={forms.body}>{mode === "pregnancy" ? t("setupLeadPregnancy") : t("setupLeadCycle")}</p>
      <TextField label={t("lastPeriod")} type="date" value={lmp} onChange={setLmp} required />
      {mode === "pregnancy" ? (
        <TextField label={t("dueDateOptional")} type="date" value={dueDate} onChange={setDueDate} />
      ) : (
        <>
          <TextField label={t("cycleLength")} inputMode="numeric" value={cycleLength} onChange={setCycleLength} required />
          <ChoiceGroup
            label={t("regularity")}
            value={regular}
            onChange={setRegular}
            options={[
              { value: "true", label: t("regular") },
              { value: "false", label: t("irregular") },
            ]}
          />
        </>
      )}
      <Notice>{t("setupNotice")}</Notice>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("saveProfile")} loading={saving} fullWidth />
    </form>
  );
}
