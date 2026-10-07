"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components-next/theme-toggle";
import { Monitor, Moon, Sun } from "lucide-react";
import styles from "./appearance.module.css";

export default function AppearanceSettings() {
  const t = useTranslations("Settings.Appearance");
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }> = [
    { value: "light", icon: <Sun size={20} aria-hidden="true" />, label: t("light") },
    { value: "dark", icon: <Moon size={20} aria-hidden="true" />, label: t("dark") },
    { value: "system", icon: <Monitor size={20} aria-hidden="true" />, label: t("system") },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </section>
      <section className={styles.section} aria-labelledby="theme-heading">
        <h2 id="theme-heading" className={styles.sectionTitle}>{t("themeTitle")}</h2>
        <div className={styles.options} role="radiogroup" aria-label={t("themeTitle")}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.option} ${theme === option.value ? styles.active : ""}`}
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => setTheme(option.value)}
            >
              <span className={styles.optionIcon}>{option.icon}</span>
              <span className={styles.optionLabel}>{option.label}</span>
              {theme === option.value && <span className={styles.check} aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
        <p className={styles.hint}>{t("hint")}</p>
      </section>
      <section className={styles.section} aria-labelledby="reduced-motion-heading">
        <h2 id="reduced-motion-heading" className={styles.sectionTitle}>{t("reducedMotionTitle")}</h2>
        <p className={styles.hint}>{t("reducedMotionDescription")}</p>
        <div className={styles.reducedMotionNotice}>
          <span aria-hidden="true">ℹ️</span>
          <span>{t("reducedMotionNotice")}</span>
        </div>
      </section>
    </main>
  );
}