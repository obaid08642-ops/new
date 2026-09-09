"use client";

import { useState } from "react";

export function CopyTextButton({ text, locale }: { text: string; locale: string }) {
  const [copied, setCopied] = useState(false);
  const ar = locale === "ar";

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={onCopy}>
      {copied ? (ar ? "تم النسخ!" : "Copied!") : (ar ? "نسخ" : "Copy")}
    </button>
  );
}
