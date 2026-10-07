import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import Link from "next/link";
import { Home, WifiOff, RefreshCw, BookOpen, MapPin, Stethoscope, Pill, Download } from "lucide-react";

type Props = { params?: Promise<{ locale?: string }> };

const popularLinks = [
  { href: "/pharmacy", label: "Pharmacy", icon: Pill, description: "Order medications" },
  { href: "/labs", label: "Lab Tests", icon: Stethoscope, description: "Book diagnostics" },
  { href: "/doctors", label: "Doctors", icon: BookOpen, description: "Find specialists" },
  { href: "/home-nursing", label: "Home Nursing", icon: Home, description: "Book home care" },
  { href: "/articles", label: "Articles", icon: BookOpen, description: "Health guides" },
  { href: "/map", label: "Map", icon: MapPin, description: "Find nearby" },
];

export default async function OfflinePage(props: Props) {
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
  const t = await getTranslations({ locale, namespace: "Offline" }).catch(async () => {
    return (key: string) => {
      const fallback: Record<string, string> = {
        title: locale === "ar" ? "أنت غير متصل" : "You're offline",
        body:
          locale === "ar"
            ? "تحقق من اتصالك بالإنترنت وحاول مرة أخرى. بعض الميزات قد لا تعمل بدون اتصال."
            : "Check your internet connection and try again. Some features may not work offline.",
        retry: locale === "ar" ? "إعادة المحاولة" : "Try again",
        returnHome: locale === "ar" ? "العودة إلى البداية" : "Return home",
        cachedContent: locale === "ar" ? "محتوى مخزن مؤقتاً" : "Cached content",
        searchPlaceholder: locale === "ar" ? "ابحث في المحتوى المخزن..." : "Search cached content...",
        popularLinks: locale === "ar" ? "روابط شائعة" : "Popular links",
        installApp: locale === "ar" ? "تثبيت التطبيق" : "Install App",
        worksOffline: locale === "ar" ? "يعمل بدون اتصال" : "Works offline",
      };
      return fallback[key] || key;
    };
  });

  const isRTL = locale === "ar" || locale === "ur";

  return (
    <main className="main" style={{ background: "#FDFDFC", minHeight: "calc(100vh - 5.15rem)", padding: "48px 16px" }}>
      <section className="auth-card" role="status" style={{
        background: "rgba(255,255,255,.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid #E8EDEE",
        borderRadius: 24,
        padding: "40px 32px",
        maxWidth: 560,
        margin: "0 auto",
        display: "grid",
        gap: 24,
        boxShadow: "0 12px 32px rgba(30,51,46,.08)",
        textAlign: "center",
      }}>
        <span aria-hidden style={{
          width: 64, height: 64, borderRadius: 20, display: "inline-grid", placeItems: "center",
          background: "rgba(10,145,166,.12)", color: "#0A91A6", margin: "0 auto -8px"
        }}>
          <WifiOff width="28" height="28" />
        </span>

        <div>
          <div className="eyebrow" style={{ color: "#0A91A6", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            OFFLINE
          </div>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.3 }}>
            {t("title")}
          </h1>
          <p style={{ margin: "12px 0 0", color: "#6B7C6E", fontSize: "1rem", lineHeight: 1.6 }}>
            {t("body")}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="button button-primary"
            style={{
              background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "none",
              padding: "14px 24px", fontWeight: 800, fontSize: "0.9375rem",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <RefreshCw width={18} height={18} aria-hidden="true" />
            {t("retry")}
          </button>
          <Link
            className="button button-secondary"
            href={`/${locale}`}
            style={{
              background: "#1E332E", color: "#fff", borderRadius: 20, border: "none",
              padding: "14px 24px", fontWeight: 800, fontSize: "0.9375rem",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <Home width={18} height={18} aria-hidden="true" />
            {t("returnHome")}
          </Link>
        </div>

        <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <label htmlFor="offline-search" className="sr-only">{t("searchPlaceholder")}</label>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            border: "1px solid #E8EDEE",
            borderRadius: 12,
            background: "#FAFBFA",
            overflow: "hidden",
          }}>
            <svg aria-hidden="true" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6B7C6E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, marginInlineStart: isRTL ? 0 : 14, marginInlineEnd: isRTL ? 14 : 0 }}
            >
              <circle cx="11" cy="11" r="6" />
              <path d="M15.5 15.5 19 19" />
            </svg>
            <input
              id="offline-search"
              type="search"
              placeholder={t("searchPlaceholder")}
              style={{
                flex: 1, border: "none", background: "transparent",
                padding: "14px 16px", fontSize: "0.9375rem", fontFamily: "inherit",
                color: "#1E332E", outline: "none", width: "100%",
              }}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "#6B7C6E" }}>
            {t("cachedContent")}
          </p>
        </div>

        <div style={{ textAlign: "left" }}>
          <h2 style={{
            margin: "0 0 12px", fontSize: "0.8125rem", fontWeight: 800,
            color: "#6B7C6E", letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            {t("popularLinks")}
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {popularLinks.map((link, i) => (
              <Link
                key={link.href}
                href={`/${locale}${link.href}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", border: "1px solid #E8EDEE",
                  borderRadius: 12, background: "#FAFBFA",
                  color: "#1E332E", textDecoration: "none",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#B8E030"; e.currentTarget.style.background = "#E8F5D6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8EDEE"; e.currentTarget.style.background = "#FAFBFA"; }}
              >
                <span style={{
                  display: "inline-grid", placeItems: "center", width: 36, height: 36,
                  borderRadius: 10, background: "rgba(30,51,46,.06)", color: "#1E332E", flexShrink: 0,
                }}>
                  <link.icon size={18} aria-hidden="true" />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#6B7C6E", marginTop: 2 }}>
                    {link.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px", border: "1px solid #E8EDEE", borderRadius: 16,
          background: "linear-gradient(135deg, rgba(95,217,179,.12), rgba(184,224,48,.12))",
          textAlign: "left",
        }}>
          <span style={{
            display: "inline-grid", placeItems: "center", width: 44, height: 44,
            borderRadius: 12, background: "rgba(30,51,46,.1)", color: "#1E332E", flexShrink: 0,
          }}>
            <Download width={22} height={22} aria-hidden="true" />
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#1E332E" }}>
              {t("installApp")}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#6B7C6E", marginTop: 2 }}>
              {t("worksOffline")}
            </div>
          </div>
          <span style={{ marginInlineStart: "auto", color: "#0A91A6", fontWeight: 800, fontSize: "0.875rem" }}>
            →
          </span>
        </div>
      </section>
    </main>
  );
}