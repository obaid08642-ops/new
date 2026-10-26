import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { visibleItems, type DisabledModules } from "@/lib/modules";
import { OrderAgainCard } from "./order-again-card";
import { PHARMACY_TONE } from "./tones";
import styles from "./pharmacy.module.css";

/**
 * Home, under the services: Reminders and My orders as two quick tiles (moved from the pharmacy page, owner layout
 * decisions 2026-10-26, item 6) in the pharmacy hub's tile style, and the "Order again" row (addition e) which draws only
 * when the signed-in patient has a past pharmacy order (GET /patient/pharmacy/orders; any other answer draws nothing).
 */
export async function HomeQuickTiles({ locale, disabled }: { locale: string; disabled: DisabledModules }) {
  const t = await getTranslations({ locale, namespace: "PharmacyBrowse" });
  const all = [
    { key: "reminders", href: `/${locale}/health/medications?tab=all`, icon: "bell", tone: "violet", label: t("hubReminders") },
    { key: "orders", href: `/${locale}/orders`, icon: "file-text", tone: PHARMACY_TONE, label: t("hubOrders") },
  ] as const;
  const items = visibleItems(all, (item) => item.href, disabled);
  if (items.length === 0) return null;
  return (
    <section aria-label={t("hubShortcuts")} className={styles.hub}>
      <ul className={styles.hubQuick}>
        {items.map((item) => (
          <li key={item.key}>
            <Link className={styles.hubTile} href={item.href}>
              <FIcon icon={item.icon} tone={item.tone} size={42} />
              <span className={styles.hubLabel}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <OrderAgainCard locale={locale} />
    </section>
  );
}
