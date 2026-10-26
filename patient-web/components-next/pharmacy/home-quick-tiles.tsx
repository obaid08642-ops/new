import Link from "next/link";
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
export function HomeQuickTiles({ locale, disabled, labels }: { locale: string; disabled: DisabledModules; labels: { shortcuts: string; reminders: string; orders: string } }) {
  // synchronous on purpose: the page reads the translations and hands the three labels down (an async server component here suspends in
  // the Home page test, which renders the shell with renderToStaticMarkup)
  const all = [
    { key: "reminders", href: `/${locale}/health/medications?tab=all`, icon: "bell", tone: "violet", label: labels.reminders },
    { key: "orders", href: `/${locale}/orders`, icon: "file-text", tone: PHARMACY_TONE, label: labels.orders },
  ] as const;
  const items = visibleItems(all, (item) => item.href, disabled);
  if (items.length === 0) return null;
  return (
    <section aria-label={labels.shortcuts} className={styles.hub}>
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
