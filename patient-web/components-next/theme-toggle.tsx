"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/app/theme";

type Props = { label: string };

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "light" };

/**
 * Theme control (12.A3).
 *
 * Three states, not two: light, dark, and "follow the system". The system
 * default is a real state rather than an initial guess, because someone who has
 * never touched the switch and someone who deliberately chose "light on a dark
 * machine" are in different states, and collapsing them means the second person
 * gets overridden the next time they restart.
 *
 * `system` is stored as the literal string, not as a resolved theme, so the
 * choice survives an OS change.
 */
export function ThemeToggle({ label }: Props) {
  const t = useTranslations("NotificationSettings");
  const names = { light: t("appearanceLight"), system: t("appearanceAuto"), dark: t("appearanceDark") } as const;
  const [theme, setTheme] = useState<Theme | "system">("system");
  const [mounted, setMounted] = useState(false);

  const apply = useCallback((next: Theme | "system") => {
    const root = document.documentElement;
    const resolved: Theme =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    // Both hooks, always together — see app/theme.ts for why this is not optional.
    root.setAttribute("data-theme", resolved);
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* private mode: fall back to following the system */
    }
    if (isTheme(stored)) setTheme(stored);
    else setTheme("system");
    setMounted(true);
  }, []);

  // While in `system`, keep following the OS without a reload.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, apply]);

  const choose = useCallback(
    (next: Theme | "system") => {
      setTheme(next);
      apply(next);
      try {
        if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
        else window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* nothing to persist to; the choice still applies for this page */
      }
    },
    [apply],
  );

  return (
    <div className="theme-toggle" role="group" aria-label={label}>
      {(["light", "system", "dark"] as const).map((option) => {
        const active = mounted && theme === option;
        return (
          <button
            key={option}
            type="button"
            className="theme-option"
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => choose(option)}
          >
            {option === "light" ? (
              <Sun size={14} aria-hidden="true" />
            ) : option === "dark" ? (
              <Moon size={14} aria-hidden="true" />
            ) : (
              <Monitor size={14} aria-hidden="true" />
            )}
            <span className="sr-only">{names[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
