"use client";

import { useCallback, useEffect, useState } from "react";
import { FIcon } from "@/components-next/ui-generated";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/app/theme";
import styles from "./home.module.css";

/**
 * The board's theme control (HomeWeb: one 44px round button with the moon; HomeApp: the same in
 * the top row). It flips light and dark and sets both theme hooks together, as app/theme.ts requires;
 * the choice is stored under the same key as the three-way ThemeToggle, so the two agree.
 */
export function ThemeButton({ label }: { label: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(isTheme(current) ? current : "light");
  }, []);

  const flip = useCallback(() => {
    const next: Theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.setAttribute("data-theme", next);
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* nothing to persist to; the choice still applies for this page */
    }
  }, []);

  return (
    <button type="button" className={styles.iconBtn} onClick={flip} aria-label={label} aria-pressed={theme === "dark"}>
      <FIcon icon="moon" tone="ink" chip="none" size={20} />
    </button>
  );
}
