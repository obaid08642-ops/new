"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import type { ScanState } from "@/lib/uploads/scan-status";
import styles from "./scan-status-badge.module.css";

/**
 * The state of an uploaded file that is not simply ready: "Being checked for safety" with a small spinner while the scan runs,
 * and the rejection with a re-upload action when it failed. Renders nothing for an ok file.
 */
export function ScanStatusBadge({ state, onReupload, className }: { state: ScanState; onReupload?: () => void; className?: string }) {
  const t = useTranslations("ScanStatus");
  if (state === "ok") return null;
  if (state === "pending") {
    return (
      <span className={`${styles.badge} ${className ?? ""}`} role="status" data-scan-state="pending">
        <Spinner size={14} />
        <span>{t("checking")}</span>
      </span>
    );
  }
  return (
    <span className={`${styles.rejected} ${className ?? ""}`} role="alert" data-scan-state="rejected">
      <span>{t("rejected")}</span>
      {onReupload ? <button type="button" className={styles.action} onClick={onReupload}>{t("uploadAnother")}</button> : null}
    </span>
  );
}
