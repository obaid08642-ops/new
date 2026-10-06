import Link from "next/link";
import styles from "./service-book-link.module.css";

export type BookableServiceType = "lab" | "radiology" | "nursing";

/**
 * Q102: where "Book" goes for a catalog service. Lab tests, lab packages and
 * radiology go to the diagnostics cart (one real diagnostics order and one
 * payment at checkout); nursing goes to the real service page. Prices come from
 * the server at checkout, never from the page.
 */
export function serviceBookHref(locale: string, type: BookableServiceType, serviceId: string, serviceName?: string): string {
  if (type === "nursing") return `/${locale}/home-care/services/${encodeURIComponent(serviceId)}`;
  const query = new URLSearchParams({ add: type === "radiology" ? `rad_${serviceId}` : serviceId });
  if (serviceName) query.set("name", serviceName);
  return `/${locale}/diagnostics/cart?${query.toString()}`;
}

export function ServiceBookLink({ locale, serviceId, serviceName, serviceType, label }: {
  locale: string;
  serviceId: string;
  serviceName?: string;
  serviceType: BookableServiceType;
  label: string;
}) {
  return <Link className={styles.bookLink} href={serviceBookHref(locale, serviceType, serviceId, serviceName)}>{label}</Link>;
}
