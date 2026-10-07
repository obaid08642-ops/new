"use client";

import { useCallback } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import styles from "./theme-toggle.module.css";

export function ThemeToggle({ label = "Theme" }: { label?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const choose = useCallback(
    (next: typeof theme) => {
      setTheme(next);
    },
    [setTheme]
  );

  // Before hydration there is no way to know what the user chose,
  // so rendering the "current" icon would flash the wrong glyph.
  // Render the neutral one.
  const currentIcon =
    theme === "system"
      ? <Monitor size={16} aria-hidden="true" />
      : resolvedTheme === "dark"
        ? <Moon size={16} aria-hidden="true" />
        : <Sun size={16} aria-hidden="true" />;

  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {(["light", "system", "dark"] as const).map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            className={styles.option}
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => choose(option)}
          >
            {option === "light" ? (
              <Sun size={14} aria-hidden="true" className={styles.icon} />
            ) : option === "dark" ? (
              <Moon size={14} aria-hidden="true" className={styles.icon} />
            ) : (
              <Monitor size={14} aria-hidden="true" className={styles.icon} />
            )}
            <span className="sr-only">{option}</span>
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        {currentIcon ? "" : ""}
      </span>
    </div>
  );
}