import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@/app/fonts";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SessionActions } from "@/components-next/session-actions";
import { PresenceBeacon } from "@/components-next/presence-beacon";
import { NabdMark } from "@/components-next/nabd-mark";
import { authCookieNames } from "@/lib/auth/cookies";
import { getDirection, isLocale, locales, type Locale } from "@/lib/i18n";
import { WebMcpProvider } from "@/components-next/web-mcp-provider";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { THEME_INIT_SCRIPT } from "@/app/theme";
import { ServiceWorkerRegister } from "@/components-next/service-worker-register";
import { NetworkPolicy } from "@/components-next/network-policy";
import { OldBrowserNotice } from "@/components-next/old-browser-notice";
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
  // proxy.ts puts the per-request CSP nonce here; an inline script without it is refused.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <NextIntlClientProvider messages={messages}>
{/* P15.1: one deadline/retry/abort/offline policy for every fetch below. */}
      <NetworkPolicy>
        <WebMcpProvider locale={typedLocale} />
        <div className={`shell ${fontVariables}`} lang={typedLocale} dir={getDirection(typedLocale)}>
          {/*
            12.A3 — the theme has to be known before the first pixel, or every
            navigation flashes the wrong theme. This is a synchronous inline script
            at the top of the body for that reason; see app/theme.ts for why it
            sets BOTH data-theme and .dark.
          */}
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          {/* P15.4: cached data stays visible offline, with banner + last-updated time. */}
          <OfflineBanner />
          {/* P15.10: old devices get a clear message, never a broken app. */}
          <OldBrowserNotice />
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
              ) : null}
            </div>
          </header>
          {hasAccessToken ? <PresenceBeacon /> : null}
          {children}
          {/* P15.3: one toast surface for every optimistic rollback on every screen. */}
          <ToastViewport />
          <footer className="site-footer">
            <nav aria-label={t("brand")} className="site-footer__links">
              <Link href={`/${typedLocale}/terms`}>{typedLocale === "ar" ? "الشروط" : "Terms"}</Link>
              <Link href={`/${typedLocale}/privacy`}>{typedLocale === "ar" ? "الخصوصية" : "Privacy"}</Link>
              <Link href={`/${typedLocale}/support`}>{typedLocale === "ar" ? "الدعم" : "Support"}</Link>
              <Link href={`/${typedLocale}/articles`}>{typedLocale === "ar" ? "المقالات" : "Articles"}</Link>
              <Link href={`/${typedLocale}/map`}>{typedLocale === "ar" ? "الخريطة" : "Map"}</Link>
            </nav>
          </footer>
        </div>
      </NetworkPolicy>
    </NextIntlClientProvider>
  );
}
