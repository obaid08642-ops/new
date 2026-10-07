"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/app/theme";

type ThemeMode = Theme | "system";

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: Theme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = (next: ThemeMode) => {
    const root = document.documentElement;
    const resolved: Theme =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;

    root.setAttribute("data-theme", resolved);
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    setResolvedTheme(resolved);
  };

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* private mode: fall back to following the system */
    }
    const initialTheme = stored === "light" || stored === "dark" ? stored : "system";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, applyTheme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    applyTheme(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* nothing to persist to; the choice still applies for this page */
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}