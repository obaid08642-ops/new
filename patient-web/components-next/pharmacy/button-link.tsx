import Link from "next/link";
import styles from "./rx.module.css";

/**
 * The design system's `Button` as a link: going to another page is a navigation (it works before the page is
 * interactive, opens in a new tab on request), not a click handler. It carries the classes `Button` draws
 * (ui-generated/components/css/Button.css), so the two look the same; `tests/pharmacy-rx.test.tsx` pins the class names.
 */
export function ButtonLink({
  href,
  label,
  variant = "primary",
  size = "lg",
  fullWidth = false,
}: {
  href: string;
  label: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <Link href={href} className={`nabd-button nabd-button--${variant} nabd-button--${size}${fullWidth ? " nabd-button--full" : ""} ${styles.linkButton}`}>
      <span className="nabd-button__label">{label}</span>
    </Link>
  );
}
