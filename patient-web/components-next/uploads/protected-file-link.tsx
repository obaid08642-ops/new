"use client";

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { outcomeOfProbe, probeFile } from "@/lib/uploads/probe-file";
import type { ScanState } from "@/lib/uploads/scan-status";
import { ScanStatusBadge } from "./scan-status-badge";
import { useScanGate } from "./use-scan-gate";

/**
 * A link to a stored file (a lab report PDF, a result file the nurse attached) that knows about the upload scan (UPLOAD_SCAN=defer).
 * A click first asks the server: a file still being scanned answers 423, shown as "Being checked for safety" with a note to come
 * back; the file is asked again every retry_after_seconds and when the tab is focused, and the link opens by itself the moment it
 * is ready. Any other answer opens the link as it always did (the page answers its own errors). It opens in the same tab (a window
 * opened after the probe's await would be taken for a pop-up).
 */
export function ProtectedFileLink({ href, label, ariaLabel, children, className = "nabd-button nabd-button--outline nabd-button--sm" }: { href: string; label?: string; ariaLabel?: string; children?: ReactNode; className?: string }) {
  const t = useTranslations("ScanStatus");
  const [initial, setInitial] = useState<ScanState>("ok");
  const state = useScanGate(initial === "pending" ? () => probeFile(href) : null, initial);

  const onClick = useCallback(async (event: MouseEvent<HTMLAnchorElement>) => {
    if (state === "pending") { event.preventDefault(); return; }
    event.preventDefault();
    const outcome = await outcomeOfProbe(href);
    if (outcome.state === "pending") setInitial("pending");
    else if (outcome.state === "rejected") setInitial("rejected");
    else window.location.assign(href);
  }, [href, state]);

  return (
    <span>
      <a href={href} className={className} onClick={(event) => void onClick(event)} aria-label={ariaLabel} aria-disabled={state === "pending" || undefined}>{children ?? label}</a>
      {state === "pending" ? <><ScanStatusBadge state="pending" /><span role="note">{t("openLater")}</span></> : null}
      {state === "rejected" ? <ScanStatusBadge state="rejected" /> : null}
    </span>
  );
}
