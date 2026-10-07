"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./mobile-menu.module.css";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

interface MobileMenuProps {
  locale: string;
  navItems?: NavItem[];
  accountLabel?: string;
  signOutLabel?: string;
  signInLabel?: string;
  hasAccessToken?: boolean;
  onSignOut?: () => void;
  className?: string;
}

export function MobileMenu({
  locale,
  navItems = defaultNavItems,
  accountLabel = "Account",
  signOutLabel = "Sign out",
  signInLabel = "Sign in",
  hasAccessToken = false,
  onSignOut,
  className = "",
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Shared");

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      closeMenu();
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setExpandedItems(new Set());
    document.body.style.overflow = "";
  };

  const openMenu = () => {
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  };

  const toggleItem = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const handleNavClick = (href: string) => {
    if (pathname === href) {
      closeMenu();
      return;
    }
    router.push(href);
    closeMenu();
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown as EventListener);
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown as EventListener);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`${styles.menuButton} ${className}`}
        onClick={isOpen ? closeMenu : openMenu}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>

      <div
        ref={menuRef}
        id="mobile-menu"
        className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className={styles.panel}>
          <header className={styles.header}>
            <span className={styles.title}>{t("navigation") || "Navigation"}</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </header>

          <nav className={styles.nav} aria-label="Main navigation">
            <ul className={styles.list}>
              {navItems.map((item) => (
                <li key={item.href} className={styles.listItem}>
                  {item.children && item.children.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.parentLink} ${expandedItems.has(item.href) ? styles.expanded : ""}`}
                        onClick={() => toggleItem(item.href)}
                        aria-expanded={expandedItems.has(item.href)}
                      >
                        <span>{item.label}</span>
                        <ChevronDown
                          size={18}
                          aria-hidden="true"
                          className={`${styles.chevron} ${expandedItems.has(item.href) ? styles.chevronOpen : ""}`}
                        />
                      </button>
                      <ul
                        className={`${styles.sublist} ${expandedItems.has(item.href) ? styles.sublistOpen : ""}`}
                        role="group"
                        aria-label={item.label}
                      >
                        {item.children.map((child) => (
                          <li key={child.href} className={styles.sublistItem}>
                            <Link
                              href={`/${locale}${child.href}`}
                              className={styles.sublistLink}
                              onClick={() => handleNavClick(`/${locale}${child.href}`)}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={`/${locale}${item.href}`}
                      className={styles.link}
                      onClick={() => handleNavClick(`/${locale}${item.href}`)}
                      aria-current={pathname === `/${locale}${item.href}` ? "page" : undefined}
                    >
                      {item.icon && <span className={styles.linkIcon} aria-hidden="true">{item.icon}</span>}
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {hasAccessToken ? (
            <div className={styles.accountSection}>
              <div className={styles.accountInfo}>
                <span className={styles.accountLabel}>{accountLabel}</span>
              </div>
              <button
                type="button"
                className={styles.signOutButton}
                onClick={() => {
                  onSignOut?.();
                  closeMenu();
                }}
              >
                {signOutLabel}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className={styles.signInLink}
              onClick={closeMenu}
            >
              {signInLabel}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

const defaultNavItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Pharmacy", href: "/pharmacy" },
  { label: "Lab Tests", href: "/labs" },
  { label: "Doctors", href: "/doctors" },
  { label: "Home Nursing", href: "/home-nursing" },
  { label: "Articles", href: "/articles" },
  { label: "Map", href: "/map" },
];