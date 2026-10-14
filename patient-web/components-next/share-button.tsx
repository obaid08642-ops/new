"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { shareOrCopy, type ShareOutcome } from "@/lib/share";

/** Share this page: the share sheet where the browser has one, otherwise the link is copied (issue 752). */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations("OffersWeb");
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);

  async function onShare() {
    setOutcome(await shareOrCopy({ title, url: window.location.href }));
  }

  return (
    <>
      <Button variant="outline" size="md" label={t("share")} onClick={() => void onShare()} />
      {outcome === "copied" || outcome === "shared" ? <p role="status">{outcome === "copied" ? t("shareCopied") : t("shareDone")}</p> : null}
      {outcome === "failed" ? <p role="alert">{t("shareFailed")}</p> : null}
    </>
  );
}
