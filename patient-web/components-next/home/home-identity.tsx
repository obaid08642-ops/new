"use client";

import Link from "next/link";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SignOutButton } from "@/components-next/sign-out-button";
import type { Locale } from "@/lib/i18n";
import styles from "./home.module.css";

/**
 * The parts of the Home top bar that depend on who is looking (F82-3).
 *
 * The public Home is static: one HTML for every visitor, cached by Next and the edge, so it holds no per-user link and
 * nothing read from a cookie. These components ask the session identity in the browser (one `/api/auth/session` request
 * per page load, shared by every component and by the layout). Until the answer arrives they render the neutral state
 * of the server HTML: the public Home link, no notifications, and an invisible stand-in with the size of the
 * sign-in button, so nothing moves for a visitor without a session and the stand-in is never a paint candidate.
 */

/** The active "Home" link of the web nav: the public Home, or the dashboard for a signed-in patient. */
export function HomeNavLink({ locale, label }: { locale: Locale; label: string }) {
  const { status } = useSessionIdentity();
  const href = status === "user" ? `/${locale}/dashboard` : `/${locale}`;
  return <Link href={href} className={`${styles.navLink} ${styles.navLinkActive}`} aria-current="page">{label}</Link>;
}

/** The notifications bell; only a signed-in patient has one. */
export function HomeNotificationsLink({ locale, label }: { locale: Locale; label: string }) {
  const { status } = useSessionIdentity();
  if (status !== "user") return null;
  return (
    <Link href={`/${locale}/notifications`} className={styles.iconBtn} aria-label={label}>
      <FIcon icon="bell" tone="ink" chip="none" size={20} />
    </Link>
  );
}

/** Sign out and the account avatar for a signed-in patient, the sign-in button for a visitor, a stand-in until known. */
export function HomeAccountTools({ locale, signInLabel, accountLabel }: { locale: Locale; signInLabel: string; accountLabel: string }) {
  const { status } = useSessionIdentity();
  if (status === "loading") {
    return <span className={`${styles.signIn} ${styles.identityPending}`} aria-hidden="true">{signInLabel}</span>;
  }
  if (status === "user") {
    return (
      <>
        <SignOutButton locale={locale} className={styles.iconBtn} />
        <Link href={`/${locale}/profile`} className={styles.accountLink} aria-label={accountLabel}>
          <Avatar name="" size="md" />
        </Link>
      </>
    );
  }
  return <Link href={`/${locale}/login`} className={styles.signIn}>{signInLabel}</Link>;
}
