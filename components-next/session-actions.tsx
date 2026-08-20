"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export function SessionActions({ locale, accountLabel, signOutLabel }: { locale: Locale; accountLabel: string; signOutLabel: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.replace(`/${locale}`); router.refresh(); }
  }

  return <div className="session-actions">
    <Link className="header-account" href={`/${locale}/profile`}><UserRound size={17} aria-hidden="true" /><span>{accountLabel}</span></Link>
    <button className="header-signout" type="button" onClick={signOut} disabled={isSigningOut} aria-label={signOutLabel}><LogOut size={17} aria-hidden="true" /><span>{signOutLabel}</span></button>
  </div>;
}
