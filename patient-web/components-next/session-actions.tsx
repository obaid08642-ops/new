"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { announceSignedOut } from "@/lib/auth/session-identity";
import { clearSwr } from "@/lib/swr-lite";
import { useSessionIdentity } from "@/lib/auth/session-identity";

/**
 * The header's account and sign-out controls. The layout is static (the same HTML for everyone), so whether to show them
 * is decided here, after hydration, from the session identity (F82-3); nothing renders for a visitor without a session.
 */
export function SessionActions({ locale, accountLabel, signOutLabel }: { locale: Locale; accountLabel: string; signOutLabel: string }) {
  const router = useRouter();
  const identity = useSessionIdentity();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { clearSwr(); announceSignedOut(); router.replace(`/${locale}`); router.refresh(); }
  }

  if (identity.status !== "user") return null;
  return <div className="session-actions">
    <Link className="header-account" href={`/${locale}/profile`}><UserRound size={17} aria-hidden="true" /><span>{accountLabel}</span></Link>
    <button className="header-signout" type="button" onClick={signOut} disabled={isSigningOut} aria-label={signOutLabel}><LogOut size={17} aria-hidden="true" /><span>{signOutLabel}</span></button>
  </div>;
}
