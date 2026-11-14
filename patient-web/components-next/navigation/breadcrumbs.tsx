import Link from "next/link";
import styles from "./breadcrumbs.module.css";

/**
 * 17.1: the visible trail of a page (Home › Section › Page). The last item is the page itself: no link, `aria-current`. The
 * same trail is in the page's BreadcrumbList structured data; this is what a reader sees. The label of the nav is the caller's.
 */
export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ label, items }: { label: string; items: Crumb[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className={styles.item}>
              {current || !item.href ? (
                <span aria-current={current ? "page" : undefined} className={current ? styles.current : styles.text}>{item.label}</span>
              ) : (
                <Link href={item.href} className={styles.link}>{item.label}</Link>
              )}
              {current ? null : <span aria-hidden="true" className={styles.sep}>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
