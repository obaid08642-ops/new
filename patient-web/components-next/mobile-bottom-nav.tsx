"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Stethoscope, Pill, TestTube2, User } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./mobile-bottom-nav.module.css";

export interface MobileBottomNavLabels {
  home: string;
  doctors: string;
  pharmacy: string;
  diagnostics: string;
  account: string;
}

export function MobileBottomNav({
  locale,
  labels,
}: {
  locale: Locale;
  labels: MobileBottomNavLabels;
}) {
  const pathname = usePathname() || "";

  const navItems = [
    {
      key: "home",
      label: labels.home,
      href: `/${locale}`,
      icon: Home,
      isActive: pathname === `/${locale}` || pathname === `/${locale}/`,
    },
    {
      key: "doctors",
      label: labels.doctors,
      href: `/${locale}/consultations/doctors`,
      icon: Stethoscope,
      isActive: pathname.startsWith(`/${locale}/consultations`) || pathname.startsWith(`/${locale}/doctor`),
    },
    {
      key: "pharmacy",
      label: labels.pharmacy,
      href: `/${locale}/c`,
      icon: Pill,
      isActive: pathname.startsWith(`/${locale}/c`) || pathname.startsWith(`/${locale}/p/`),
    },
    {
      key: "diagnostics",
      label: labels.diagnostics,
      href: `/${locale}/diagnostics/labs`,
      icon: TestTube2,
      isActive: pathname.startsWith(`/${locale}/diagnostics`) || pathname.startsWith(`/${locale}/labs`) || pathname.startsWith(`/${locale}/radiology`),
    },
    {
      key: "account",
      label: labels.account,
      href: `/${locale}/dashboard`,
      icon: User,
      isActive:
        pathname.startsWith(`/${locale}/dashboard`) ||
        pathname.startsWith(`/${locale}/profile`) ||
        pathname.startsWith(`/${locale}/appointments`) ||
        pathname.startsWith(`/${locale}/orders`),
    },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Mobile Navigation">
      <div className={styles.inner}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`${styles.navItem}${item.isActive ? ` ${styles.active}` : ""}`}
              aria-current={item.isActive ? "page" : undefined}
            >
              <div className={styles.iconWrapper}>
                <Icon size={21} strokeWidth={item.isActive ? 2.3 : 1.75} aria-hidden="true" />
              </div>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
