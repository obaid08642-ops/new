"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { loadInterestState, submitInterest, type InterestType } from "@/lib/catalogue-interest";
import forms from "@/components-next/consult/consult.module.css";

type State = "loading" | "guest" | "ready" | "done";
export type { InterestType };

/**
 * "Notify me when available" on a catalogue service nobody offers yet (POST /catalogue-interest { service_type, service_id } through
 * /api/patient; the server keeps one interest per patient and service, so pressing twice leaves one). Whether the patient already asked comes
 * from GET /catalogue-interest/mine. A visitor who is not signed in gets the sign-in link instead of the button; once registered the button
 * is replaced by a confirmation.
 */
export function NotifyMeButton({ serviceType, serviceId, locale }: { serviceType: InterestType; serviceId: string; locale: string }) {
  const t = useTranslations("DiagWeb");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    void loadInterestState(serviceType, serviceId).then((next) => { if (live) setState(next === "asked" ? "done" : next); });
    return () => { live = false; };
  }, [serviceType, serviceId]);

  async function register() {
    setBusy(true);
    setError(false);
    const result = await submitInterest(serviceType, serviceId);
    setBusy(false);
    if (result === "guest") setState("guest");
    else if (result === "done") setState("done");
    else setError(true);
  }

  if (state === "loading") return null;
  if (state === "guest") return <ButtonLink href={`/${locale}/login`} label={t("notifyMeSignIn")} variant="outline" size="lg" fullWidth />;
  if (state === "done") return <p className={forms.body} role="status" data-testid="notify-me-done">{t("notifyMeDone")}</p>;
  return (
    <>
      <Button variant="primary" size="lg" fullWidth label={t("notifyMe")} loading={busy} onClick={() => void register()} />
      {error ? <p className={forms.error} role="alert">{t("notifyMeFailed")}</p> : null}
    </>
  );
}
