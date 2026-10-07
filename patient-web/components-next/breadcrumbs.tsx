"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./breadcrumbs.module.css";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  "aria-label"?: string;
  separator?: React.ReactNode;
  homeLabel?: string;
}

export function Breadcrumbs({
  items = [],
  className = "",
  "aria-label": ariaLabel = "Breadcrumb",
  separator = <ChevronRight size={16} aria-hidden="true" />,
  homeLabel,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const t = useTranslations("Shared");

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbs(pathname, t, homeLabel);

  return (
    <nav className={`${styles.nav} ${className}`} aria-label={ariaLabel}>
      <ol className={styles.list}>
        {breadcrumbItems.map((item, index) => (
          <li key={index} className={styles.item}>
            {index > 0 && <span className={styles.separator} aria-hidden="true">{separator}</span>}
            {item.href ? (
              <Link
                href={item.href}
                className={`${styles.link} ${item.isCurrent ? styles.current : ""}`}
                aria-current={item.isCurrent ? "page" : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <span className={`${styles.current} ${styles.text}`} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(pathname: string, t: ReturnType<typeof useTranslations>, homeLabel?: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] || "ar";
  const pathSegments = segments.slice(1);

  const items: BreadcrumbItem[] = [
    { label: homeLabel || t("home") || "Home", href: `/${locale}`, isCurrent: pathSegments.length === 0 },
  ];

  let currentPath = `/${locale}`;

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    // Convert slug to readable label
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    items.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrent: isLast,
    });
  });

  return items;
}

export function BreadcrumbsClient({ items, className, "aria-label": ariaLabel, separator, homeLabel }: BreadcrumbsProps) {
  const pathname = usePathname();
  const t = useTranslations("Shared");

  const breadcrumbItems = items?.length ? items : generateBreadcrumbs(pathname, t, homeLabel);

  return (
    <nav className={`${styles.nav} ${className}`} aria-label={ariaLabel}>
      <ol className={styles.list}>
        {breadcrumbItems.map((item, index) => (
          <li key={index} className={styles.item}>
            {index > 0 && <span className={styles.separator} aria-hidden="true">{separator}</span>}
            {item.href ? (
              <Link
                href={item.href}
                className={`${styles.link} ${item.isCurrent ? styles.current : ""}`}
                aria-current={item.isCurrent ? "page" : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <span className={`${styles.current} ${styles.text}`} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}