"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { receiptToPng } from "@/lib/receipt/capture";
import styles from "./receipt.module.css";

/** "Save as image": the card on screen as a PNG file (lib/receipt/capture.ts). */
export function ReceiptImage({ label, failed, fileName }: Readonly<{ label: string; failed: string; fileName: string }>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    if (busy) return;
    const card = document.querySelector<HTMLElement>("[data-receipt-card]");
    if (!card) return;
    setBusy(true); setError(false);
    try {
      const background = getComputedStyle(document.body).backgroundColor;
      const blob = await receiptToPng(card, background);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); } finally { setBusy(false); }
  }

  return (
    <>
      <Button label={label} variant="outline" size="lg" onClick={save} disabled={busy} />
      {error ? <p className={styles.error} role="alert">{failed}</p> : null}
    </>
  );
}
