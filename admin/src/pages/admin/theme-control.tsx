import { useEffect, useState } from "react";
import tokens from "../../../../packages/design-tokens/tokens.json";

/**
 * 12.A12 — brand controls.
 *
 * This page used to be the opposite of the requirement. It rendered an
 * `<input type="color">` per brand value, wrote the result to `--brand` on the
 * document root, and reported "the colours are applied to all screens". So the
 * brand was editable in admin, and the edit was a free choice by anyone with the
 * page open — a product wearing a colour nobody chose, applied globally, with no
 * contrast check anywhere.
 *
 * What it is now:
 *
 *   - the brand colours are SHOWN, and not editable. They are the owner's. A free
 *     colour picker on the identity is the defect, not the feature;
 *   - the only thing an admin controls is WHICH pre-designed seasonal theme is
 *     active, and WHEN. Those are token overrides chosen in tokens.json and
 *     contrast-checked in CI under both light and dark, so activating one cannot
 *     produce an unreadable screen.
 *
 * The brand values come from tokens.json rather than being restated here, so this
 * page cannot drift from the palette it is meant to display.
 */

type SeasonalTheme = {
  id: string;
  label: Record<string, string>;
  window: { from: string; to: string } | null;
  overrides: Record<string, string | { light: string; dark: string }>;
};

const seasonal = (tokens as unknown as { seasonal: { themes: SeasonalTheme[] } }).seasonal;
const THEMES = seasonal.themes;
const BRAND_PATHS = ["color.brand.coral", "color.brand.ink", "color.accent.lime"] as const;

function readToken(path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], tokens);
  if (value && typeof value === "object" && "light" in (value as object)) {
    return String((value as { light: unknown }).light);
  }
  return String(value);
}

const SCHEMA_KEY = "nabd.seasonal";
const SCHEDULED_KEY = "nabd.seasonalSchedule";

/** Is a theme inside its own window today? Windows wrap across the year end. */
export function inWindow(
  window: { from: string; to: string } | null,
  today = new Date(),
): boolean {
  if (!window) return false;
  const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = md(today);
  return window.from <= window.to
    ? now >= window.from && now <= window.to
    : now >= window.from || now <= window.to;
}

export default function ThemeControl() {
  const [active, setActive] = useState<string>("default");
  const [scheduled, setScheduled] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SCHEMA_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) setActive(stored);
      setScheduled(window.localStorage.getItem(SCHEDULED_KEY) !== "off");
    } catch {
      /* private mode: the default stands */
    }
  }, []);

  const apply = (id: string) => {
    setActive(id);
    try {
      window.localStorage.setItem(SCHEMA_KEY, id);
    } catch {
      /* the choice still applies for this page */
    }
    // One attribute on <html> does the whole thing: seasonal.css is a set of
    // token overrides, so nothing here has to know a colour.
    document.documentElement.setAttribute("data-seasonal", id);
  };

  const setScheduling = (on: boolean) => {
    setScheduled(on);
    try {
      if (on) window.localStorage.removeItem(SCHEDULED_KEY);
      else window.localStorage.setItem(SCHEDULED_KEY, "off");
    } catch {
      /* ignore */
    }
  };

  const s = { maxWidth: 880, fontFamily: "system-ui, sans-serif" } as const;
  const card = { border: "1px solid var(--nabd-color-border-subtle)", borderRadius: 12, padding: 16, background: "var(--nabd-color-bg-surface)" } as const;

  return (
    <main style={{ maxWidth: 880, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--nabd-color-text-primary)" }}>
        {t("brandControls.seasonalTitle", { default: "الألوان الموسمية" })}
      </h1>
      <p style={{ color: "var(--nabd-color-text-secondary)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
        {t("brandControls.seasonalIntro", { default: "ألوان العلامة ثابتة ولا تُعدَّل. ما يمكن تغييره هو السمة الموسمية المصمَّمة مسبقاً ومُختبَرة تبايناً في الوضعين الفاتح والداكن." })}
      </p>

      <section style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--nabd-color-text-primary)" }}>
          {t("brandControls.brandLockedTitle", { default: "ألوان العلامة — غير قابلة للتحرير" })}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 14 }}>
          {BRAND_PATHS.map((path) => {
            const value = readToken(path);
            return (
              <div key={path}>
                <div
                  aria-hidden="true"
                  style={{ width: 44, height: 44, borderRadius: 10, background: value, border: "1px solid var(--nabd-color-border-subtle)" }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: "var(--nabd-color-text-primary)" }}>
                  {path.split(".").pop()}
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--nabd-color-text-secondary)" }}>
                  {value}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--nabd-color-text-primary)" }}>
          <input type="checkbox" checked={scheduled} onChange={(e) => setScheduling(e.target.checked)} />
          {t("brandControls.scheduleAuto", { default: "تفعيل السمة الموسمية تلقائياً في مواسمها" })}
        </label>

        <div role="radiogroup" aria-label={t("brandControls.seasonalGroup", { default: "السمة الموسمية" })} style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {THEMES.map((theme) => {
            const on = active === theme.id;
            const inSeason = inWindow(theme.window);
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => apply(theme.id)}
                data-testid={`seasonal-${theme.id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "12px 14px", textAlign: "start", cursor: "pointer", borderRadius: 10,
                  border: `1px solid ${on ? "var(--nabd-color-action-primary-bg)" : "var(--nabd-color-border-subtle)"}`,
                  background: on ? "var(--nabd-color-status-danger-bg)" : "var(--nabd-color-bg-surface)",
                  color: "var(--nabd-color-text-primary)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {theme.label.ar} · {theme.label.en}
                </span>
                <span style={{ fontSize: 12, color: "var(--nabd-color-text-secondary)" }}>
                  {theme.window ? `${theme.window.from} → ${theme.window.to}` : t("brandControls.manual", { default: "يدوي" })}
                  {inSeason ? " · في موسمه الآن" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
