"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ConfirmDialog } from "@/components-next/confirm/confirm-dialog";
import { Toast } from "@/components-next/feedback/toast";
import forms from "@/components-next/consult/consult.module.css";

/**
 * QA I-03: the patient deletes the saved insurance card. DELETE /api/insurance/policy (the BFF of the backend's
 * DELETE /users/me/insurance) after a confirm; the page is refreshed on success and the dialog stays closed with the error and a retry on failure.
 */
export function DeletePolicyAction() {
  const t = useTranslations("InsuranceWeb");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/insurance/policy", { method: "DELETE" });
      if (!res.ok) setFailed(true);
      else {
        setToast(t("deleteDone"));
        router.refresh();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <>
      <Toast message={toast} onDone={() => setToast(null)} />
      <Button label={t("deletePolicy")} variant="outline" fullWidth onClick={() => { setFailed(false); setAsking(true); }} />
      {failed ? (
        <>
          <p className={forms.error} role="alert">{t("deleteFailed")}</p>
          <Button label={t("deletePolicy")} variant="outline" fullWidth onClick={() => setAsking(true)} />
        </>
      ) : null}
      <ConfirmDialog
        open={asking}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={busy ? t("deleting") : t("deletePolicy")}
        cancelLabel={t("deleteCancel")}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => { if (!busy) setAsking(false); }}
      />
    </>
  );
}
