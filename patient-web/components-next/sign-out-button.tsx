"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { Locale } from "@/lib/i18n";
import { clearSwr } from "@/lib/swr-lite";
import styles from "./sign-out-button.module.css";

/**
 * Sign-out for the Home and core shells (their own header hides the layout's SessionActions). POST /api/auth/logout
 * clears the session cookies; the person lands on the public Home. `className` is the shell's own round icon-button class.
 */
export function SignOutButton({ locale, className }: { locale: Locale; className: string }) {
  const router = useRouter();
  const t = useTranslations("Shared");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { clearSwr(); router.replace(`/${locale}`); router.refresh(); }
  }

  return (
    <button type="button" className={className} onClick={signOut} disabled={busy} aria-label={t("signOut")} title={t("signOut")}>
      <span className={styles.mirror}><Icon name="signout" size={20} tone="currentColor" /></span>
    </button>
  );
}
