"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw, Home, AlertTriangle, Search, BookOpen, MapPin, Stethoscope, Pill } from "lucide-react";

const popularLinks = [
  { href: "/pharmacy", label: "Pharmacy", icon: Pill, description: "Order medications" },
  { href: "/labs", label: "Lab Tests", icon: Stethoscope, description: "Book diagnostics" },
  { href: "/doctors", label: "Doctors", icon: BookOpen, description: "Find specialists" },
  { href: "/home-nursing", label: "Home Nursing", icon: Home, description: "Book home care" },
  { href: "/articles", label: "Articles", icon: BookOpen, description: "Health guides" },
  { href: "/map", label: "Map", icon: MapPin, description: "Find nearby" },
];

export default function ServerError() {
  const locale = useLocale();
  const t = useTranslations("RouteState");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Auto-retry once after 3 seconds
    const timer = setTimeout(() => {
      if (retryCount === 0) {
        setRetryCount(1);
        window.location.reload();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [retryCount]);

  const isRTL = locale === "ar" || locale === "ur";

  return (
    <main className="main" style={{ background: "#FDFDFC", minHeight: "calc(100vh - 5.15rem)", padding: "48px 16px" }}>
      <section className="auth-card" role="alert" aria-live="assertive" style={{
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
          background: "rgba(255,77,90,.12)", color: "#FF4D5A", margin: "0 auto -8px"
        }}>
          <AlertTriangle width="28" height="28" />
        </span>

        <div>
          <div className="eyebrow" style={{ color: "#1E332E", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            500
          </div>
          <h1 style={{ margin: 0, color: "#1E332E", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.3 }}>
            {t("errorTitle") || (locale === "ar" ? "خطأ في الخادم" : "Server Error")}
          </h1>
          <p style={{ margin: "12px 0 0", color: "#6B7C6E", fontSize: "1rem", lineHeight: 1.6 }}>
            {t("errorBody") || (locale === "ar" ? "حدث خطأ غير متوقع. فريقنا يعمل على إصلاحه." : "Something went wrong. Our team is working on it.")}
          </p>
        </div>

        {retryCount > 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, margin: "0 auto",
            padding: "8px 16px", borderRadius: 999, background: "rgba(255,77,90,.12)",
            color: "#FF4D5A", fontSize: "0.8125rem", fontWeight: 700,
          }}>
            <RefreshCw width={16} height={16} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
            {locale === "ar" ? "محاولة إعادة الاتصال..." : "Retrying connection..."}
          </div>
        )}

        <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <label htmlFor="error-search" className="sr-only">Search</label>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            border: "1px solid #E8EDEE",
            borderRadius: 12,
            background: "#FAFBFA",
            overflow: "hidden",
          }}>
            <Search
              aria-hidden="true"
              style={{
                width: 20, height: 20, color: "#6B7C6E", flexShrink: 0,
                marginInlineStart: isRTL ? 0 : 14, marginInlineEnd: isRTL ? 14 : 0,
              }}
            />
            <input
              id="error-search"
              type="search"
              placeholder={locale === "ar" ? "ابحث عن خدمة، دواء، مقال..." : "Search for service, medicine, article..."}
              style={{
                flex: 1, border: "none", background: "transparent",
                padding: "14px 16px", fontSize: "0.9375rem", fontFamily: "inherit",
                color: "#1E332E", outline: "none", width: "100%",
              }}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
        </div>

        <div style={{ textAlign: "left" }}>
          <h2 style={{
            margin: "0 0 12px", fontSize: "0.8125rem", fontWeight: 800,
            color: "#6B7C6E", letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            {locale === "ar" ? "روابط شائعة" : "Popular links"}
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
            {t("retry") || (locale === "ar" ? "إعادة المحاولة" : "Try again")}
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
            {t("returnHome") || (locale === "ar" ? "العودة إلى البداية" : "Return home")}
          </Link>
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}