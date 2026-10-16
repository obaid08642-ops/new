"use client";

import { useCallback, useEffect, useState } from "react";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { applyThemeToDocument, isTheme, saveThemeChoice, type Theme } from "@/app/theme";
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
    applyThemeToDocument(next);
    setTheme(next);
    saveThemeChoice(next);
  }, []);

  return (
    <button type="button" className={styles.iconBtn} onClick={flip} aria-label={label} aria-pressed={theme === "dark"}>
      <FIcon icon="moon" tone="ink" chip="none" size={20} />
    </button>
  );
}
