import Link from "next/link";
import styles from "./consult.module.css";

/**
 * The board's segmented control (canvas/Appointments tabs, Consult filters) for choices that are pages: each option is a
 * link to the same screen with another query, so it works before the page is interactive and the choice is in the URL.
 * `aria-current` marks the chosen one.
 */
export function LinkSegmented({ label, options, value }: { label: string; options: Array<{ value: string; label: string; href: string }>; value: string }) {
  return (
    <nav className={styles.segLinks} aria-label={label}>
      {options.map((option) => (
        <Link key={option.value} href={option.href} aria-current={option.value === value ? "page" : undefined} replace>{option.label}</Link>
      ))}
    </nav>
  );
}
