"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Radio, SectionHeader, Segmented, Toggle } from "@/components-next/ui-generated";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "@/app/theme";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import styles from "./settings.module.css";

type Mode = Theme | "system";
type Group = "categories" | "channels";
export type SettingRow = { group: Group; key: string; label: string; value: boolean };

export type SettingsLabels = {
  appearance: string; appearanceAuto: string; appearanceLight: string; appearanceDark: string; appearanceHint: string;
  language: string; notifications: string; channels: string; saveFailed: string; unavailable: string;
};

/** English names of the languages, shown beside each native name as on the board. */
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
 * The rows of canvas/Settings: appearance (Segmented), language (Radio list) and the switches (Toggle).
 * The switches save through the app's own PATCH /users/me/notification-settings (the patient API
 * proxy); a failed save puts the switch back and says so.
 */
export function NotificationSettingsClient({ locale, rows, labels }: { locale: Locale; rows: SettingRow[]; labels: SettingsLabels }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("system");
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [`${r.group}.${r.key}`, r.value])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

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

  async function save(row: SettingRow, next: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = `${row.group}.${row.key}`;
    setBusy(id); setError(false);
    setValues((v) => ({ ...v, [id]: next }));
    try {
      const response = await fetch("/api/patient/users/me/notification-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ [row.group]: { [row.key]: next } }),
      });
      if (!response.ok) throw new Error("save_failed");
    } catch {
      setValues((v) => ({ ...v, [id]: !next }));
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const switchRows = (group: Group) => rows.filter((r) => r.group === group);
  const renderSwitches = (group: Group, title: string) => {
    const list = switchRows(group);
    if (list.length === 0) return null;
    return <section className={styles.section} aria-label={title}>
      <SectionHeader title={title} />
      <Card padding="none">
        <ul className={styles.list}>
          {list.map((row) => {
            const id = `${row.group}.${row.key}`;
            return <li key={id} className={styles.switchRow}>
              <span className={styles.switchLabel}>{row.label}</span>
              <Toggle label={row.label} value={values[id]} loading={busy === id} onChange={(next) => void save(row, next)} />
            </li>;
          })}
        </ul>
      </Card>
    </section>;
  };

  return <>
    <section className={styles.section} aria-label={labels.appearance}>
      <SectionHeader title={labels.appearance} />
      <Segmented
        label={labels.appearance}
        value={mode}
        onChange={chooseMode}
        options={[
          { value: "system", label: labels.appearanceAuto },
          { value: "light", label: labels.appearanceLight },
          { value: "dark", label: labels.appearanceDark },
        ]}
      />
      <p className={styles.hint}>{labels.appearanceHint}</p>
    </section>

    <section className={styles.section} aria-label={labels.language}>
      <SectionHeader title={labels.language} />
      <Card padding="none">
        <div role="radiogroup" aria-label={labels.language} className={styles.list}>
          {locales.map((code, index) => (
            <Radio
              key={code}
              label={localeLabels[code]}
              meta={ENGLISH_NAME[code]}
              selected={code === locale}
              divider={index < locales.length - 1}
              onChange={() => { if (code !== locale) router.push(`/${code}/notifications/settings`); }}
            />
          ))}
        </div>
      </Card>
    </section>

    {rows.length === 0 ? <p className={styles.hint} role="status">{labels.unavailable}</p> : null}
    {renderSwitches("categories", labels.notifications)}
    {renderSwitches("channels", labels.channels)}
    {error ? <p className={styles.error} role="alert">{labels.saveFailed}</p> : null}
  </>;
}
