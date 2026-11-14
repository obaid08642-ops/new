"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";

type Props = Readonly<{ label: string; title: string; pdfHref: string; fileName: string; pageHref: string }>;

/** "Share": the PDF as a file where the browser can share files, else the link of the receipt; not drawn where the browser has no share sheet. */
export function ReceiptShare({ label, title, pdfHref, fileName, pageHref }: Props) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSupported(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  if (!supported) return null;

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(pdfHref, { cache: "no-store" });
      if (response.ok) {
        const file = new File([await response.blob()], fileName, { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, files: [file] });
          return;
        }
      }
      await navigator.share({ title, url: new URL(pageHref, window.location.origin).toString() });
    } catch {
      // the reader closed the share sheet, or the browser refused: nothing was sent
    } finally {
      setBusy(false);
    }
  }

  return <Button label={label} variant="outline" size="lg" onClick={share} disabled={busy} />;
}
