"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { copyText } from "@/lib/copy-text";

/**
 * "Share" as in the app: the browser's share sheet where there is one, else the text is copied and the label says so.
 * `text` is built on the server from the record the viewer is already looking at; nothing is read or sent anywhere else.
 */
export function ShareButton({ label, copiedLabel, text, variant = "outline", size = "sm" }: { label: string; copiedLabel: string; text: string; variant?: "primary" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try { await navigator.share({ text }); return; } catch (error) { if ((error as { name?: string } | null)?.name === "AbortError") return; }
    }
    const ok = await copyText(text);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  return <Button label={copied ? copiedLabel : label} size={size} variant={variant} onClick={() => void share()} />;
}
