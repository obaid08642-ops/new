"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import styles from "./core.module.css";

/**
 * 17.1: the phone menu. The tab bar has five sections; this menu opens the rest of the signed-in places (the account, orders,
 * family, articles, settings, help) from the phone header. It is a disclosure: a button with `aria-expanded` that shows a list
 * of links. Escape closes it, and it closes when a link is followed or the page changes. It is hidden from the wide layout.
 */
export type PhoneMenuItem = { label: string; href: string };

export function PhoneMenu({ labels, items }: { labels: { open: string; close: string }; items: PhoneMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);

  // A page change (following a link) closes the menu; the state is kept on the page the user left, so it is reset here.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`${styles.phoneOnly} ${styles.menuWrap}`}>
      <button
        ref={button}
        type="button"
        className={styles.iconLink}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "list"} size={20} tone="currentColor" />
      </button>
      {open ? (
        <nav id={panelId} aria-label={labels.open} className={styles.menuPanel}>
          <ul className={styles.menuList}>
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.menuLink}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
