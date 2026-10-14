"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { Locale } from "@/lib/i18n";
import { announceSignedOut } from "@/lib/auth/session-identity";
import { clearSwr } from "@/lib/swr-lite";

/** The board's "تسجيل الخروج" button (canvas/Account): the same sign-out as the header's (POST /api/auth/logout, then the public Home). */
export function SignOutAction({ locale }: { locale: Locale }) {
  const t = useTranslations("Shared");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { clearSwr(); announceSignedOut(); router.replace(`/${locale}`); router.refresh(); }
  }

  return <Button label={t("signOut")} variant="outline" fullWidth loading={busy} onClick={() => void signOut()} />;
}
