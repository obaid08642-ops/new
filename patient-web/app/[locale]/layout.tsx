import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import Link from "next/link";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SessionActions } from "@/components-next/session-actions";
import { PresenceBeacon } from "@/components-next/presence-beacon";
import { NabdMark } from "@/components-next/nabd-mark";
import { ShieldCheck } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { getDirection, isLocale, locales, type Locale } from "@/lib/i18n";
import { WebMcpProvider } from "@/components-next/web-mcp-provider";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { THEME_INIT_SCRIPT } from "@/app/theme";
import { ServiceWorkerRegister } from "@/components-next/service-worker-register";
import { NetworkPolicy } from "@/components-next/network-policy";
import { OfflineBanner } from "@/components-next/network/offline-banner";
import { ToastViewport } from "@/components-next/network/toast-viewport";

type Props = Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"),
    title: { default: t("siteTitle"), template: `%s | ${t("siteTitle")}` },
    description: t("siteDescription"),
    alternates: {
      languages: {
        ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, `/${supportedLocale}`])),
        "x-default": "/ar",
      },
    },
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: t("siteTitle"),
      images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: t("siteTitle") }],
    },
    twitter: { card: "summary_large_image", images: ["/images/og-default.jpg"] },
    other: {
      "ai-catalog": "/.well-known/ai-catalog.json",
      "a2a-agent-card": "/.well-known/agent-card.json",
      "mcp-server-card": "/.well-known/mcp/server-card.json",
      // Smart App Banners render only when store IDs are configured via env.
      // No placeholder IDs are invented: absent env = no banner (never a dead banner).
      ...(process.env.NEXT_PUBLIC_IOS_APP_ID
        ? { "apple-itunes-app": `app-id=${process.env.NEXT_PUBLIC_IOS_APP_ID}, app-argument=${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"}` }
        : {}),
      ...(process.env.NEXT_PUBLIC_ANDROID_PACKAGE
        ? { "google-play-app": `app-id=${process.env.NEXT_PUBLIC_ANDROID_PACKAGE}` }
        : {}),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  setRequestLocale(typedLocale);
  const messages = await getMessages({ locale: typedLocale });
  const t = await getTranslations({ locale: typedLocale, namespace: "Shared" });
  const hasAccessToken = Boolean((await cookies()).get(authCookieNames.access)?.value);

  return (
    <NextIntlClientProvider messages={messages}>
      {/* P15.1: one deadline/retry/abort/offline policy for every fetch below. */}
      <NetworkPolicy>
        <WebMcpProvider locale={typedLocale} />
        <div className={`shell ${tajawal.variable}`} lang={typedLocale} dir={getDirection(typedLocale)}>
          {/*
            12.A3 — the theme has to be known before the first pixel, or every
            navigation flashes the wrong theme. This is a synchronous inline script
            at the top of the body for that reason; see app/theme.ts for why it
            sets BOTH data-theme and .dark.
          */}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          {/* P15.4: cached data stays visible offline, with banner + last-updated time. */}
          <OfflineBanner />
          <header className="topbar">
            <Link className="brand" href={`/${typedLocale}`}>
              <span className="brand-mark">
                <NabdMark size={26} />
              </span>
              <span className="brand-wordmark">{t("brand")}</span>
            </Link>
            <div className="nav-actions">
              <LocaleSelector current={typedLocale} label={t("language")} />
              <ThemeToggle label={t("theme")} />
              {hasAccessToken ? (
                <SessionActions locale={typedLocale} accountLabel={t("account")} signOutLabel={t("signOut")} />
              ) : (
                <Link className="button button-primary header-login" href={`/${typedLocale}/login`}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>{t("patientSignIn")}</span>
                </Link>
              )}
            </div>
          </header>
          {hasAccessToken ? <PresenceBeacon /> : null}
          {children}
          {/* P15.3: one toast surface for every optimistic rollback on every screen. */}
          <ToastViewport />
          <footer style={{ borderTop: "1px solid #E8EDEE", marginTop: 48, padding: "24px 16px", background: "#FDFDFC" }}>
            <nav aria-label={t("brand")} style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", rowGap: 12, columnGap: 24 }}>
              <Link href={`/${typedLocale}/terms`} style={{ padding: "4px 0", whiteSpace: "nowrap" }}>{typedLocale === "ar" ? "الشروط" : "Terms"}</Link>
              <Link href={`/${typedLocale}/privacy`} style={{ padding: "4px 0", whiteSpace: "nowrap" }}>{typedLocale === "ar" ? "الخصوصية" : "Privacy"}</Link>
              <Link href={`/${typedLocale}/support`} style={{ padding: "4px 0", whiteSpace: "nowrap" }}>{typedLocale === "ar" ? "الدعم" : "Support"}</Link>
              <Link href={`/${typedLocale}/articles`} style={{ padding: "4px 0", whiteSpace: "nowrap" }}>{typedLocale === "ar" ? "المقالات" : "Articles"}</Link>
              <Link href={`/${typedLocale}/map`} style={{ padding: "4px 0", whiteSpace: "nowrap" }}>{typedLocale === "ar" ? "الخريطة" : "Map"}</Link>
            </nav>
          </footer>
        </div>
      </NetworkPolicy>
    </NextIntlClientProvider>
  );
}
