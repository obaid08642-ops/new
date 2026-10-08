"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Radio, Segmented } from "@/components-next/ui-generated/components/Controls";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/app/theme";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import { FlushCard, Group } from "./settings-kit";
import styles from "./settings.module.css";

type Mode = Theme | "system";

/** English names of the languages, shown beside each native name as on the board (canvas/Settings). */
const ENGLISH_NAME: Record<Locale, string> = { ar: "Arabic", en: "English", ur: "Urdu", hi: "Hindi", bn: "Bengali", fil: "Filipino" };

function applyTheme(next: Mode) {
  const root = document.documentElement;
  const resolved: Theme = next === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
  // Both hooks, always together (app/theme.ts explains why).
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * The two top sections of canvas/Settings: appearance (a segmented control, kept on this device) and language (a radio list;
 * choosing one opens this page in that language). This is the one place the theme and the language are chosen on the
 * settings side (the Batch 0 notification-settings screen held them before the merge).
 */
export function AppearanceLanguage({ locale }: { locale: Locale }) {
  const t = useTranslations("NotificationSettings");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(THEME_STORAGE_KEY); } catch { /* private mode: follow the system */ }
    setMode(isTheme(stored) ? stored : "system");
  }, []);

  function chooseMode(next: string) {
    const value: Mode = next === "light" || next === "dark" ? next : "system";
    setMode(value);
    applyTheme(value);
    try {
      if (value === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch { /* nothing to persist to; the choice still applies on this page */ }
  }

  return (
    <>
      <Group id="appearance" title={t("appearance")}>
        <Segmented
          label={t("appearance")}
          value={mode}
          onChange={chooseMode}
          options={[
            { value: "system", label: t("appearanceAuto") },
            { value: "light", label: t("appearanceLight") },
            { value: "dark", label: t("appearanceDark") },
          ]}
        />
        <p className={styles.hint}>{t("appearanceHint")}</p>
      </Group>
      <Group id="language" title={t("language")}>
        <FlushCard>
          <div role="radiogroup" aria-label={t("language")} className={styles.list}>
            {locales.map((code, index) => (
              <Radio
                key={code}
                label={localeLabels[code]}
                meta={ENGLISH_NAME[code]}
                selected={code === locale}
                divider={index < locales.length - 1}
                onChange={() => { if (code !== locale) router.push(`/${code}/settings/language`); }}
              />
            ))}
          </div>
        </FlushCard>
      </Group>
    </>
  );
}
