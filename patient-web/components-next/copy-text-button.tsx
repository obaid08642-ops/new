"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";

/** Copies a text (the health ID share code) to the clipboard and says so for two seconds. */
export function CopyTextButton({ text }: { text: string }) {
  const t = useTranslations("HealthWeb");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return <Button variant="outline" size="md" label={copied ? t("copied") : t("copy")} onClick={() => void onCopy()} />;
}
