import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params?: Promise<{ locale?: string }> };

export default async function LocaleNotFound(props: Props) {
  let locale = "ar";
  if (props?.params) {
    try {
      const p = await props.params;
      if (p?.locale && isLocale(p.locale)) locale = p.locale;
    } catch {
      // ignore
    }
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "NotFound" }).catch(async () => {
    return (key: string) => {
      const fallback: Record<string, string> = {
        title: locale === "ar" ? "الصفحة غير متاحة" : "Page unavailable",
        body:
          locale === "ar"
            ? "لا يمكن فتح هذا المسار أو أنك لا تملك صلاحية الوصول إليه."
            : "This route cannot be opened or you do not have permission to access it.",
        returnHome: locale === "ar" ? "العودة إلى البداية" : "Return home",
      };
      return fallback[key] || key;
    };
  });

  return (
    <main className="main auth-wrap" style={{ background: "#FDFDFC", padding: "32px 16px" }}>
      <section className="auth-card" role="status" style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, maxWidth: 480, margin: "0 auto", display: "grid", gap: 16, boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <span aria-hidden style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(95,217,179,.18)", color: "#1E332E" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5 19 19" /><path d="M8.5 11h5" /></svg>
        </span>
        <div className="eyebrow" style={{ color: "#1E332E" }}>404</div>
        <h1 style={{ margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</h1>
        <p style={{ margin: 0, color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("body")}</p>
        <Link className="button button-primary" href={`/${locale}`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "none" }}>{t("returnHome")}</Link>
      </section>
    </main>
  );
}
