import type { Metadata, Viewport } from "next";
import { OfflineSupport } from "@/components-next/offline-support";
import { OfflineBanner } from "@/components-next/network/offline-banner";
import Link from "next/link";
import "../globals.css";
import "../motion.css";
import { THEME_COLOR } from "../design-tokens/theme-color";
// DEVICE_STANDARD §1 web shells (<AppShell>, <StickyFooter>), mirrored from packages/ui/shells.
import "@/components-next/ui-generated/shells/shells.css";
import "@/components-next/ui-generated/components/components.css";
import { fontVariables } from "@/app/fonts";
import { WebVitalsReporter } from "@/components-next/web-vitals-reporter";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SessionActions } from "@/components-next/session-actions";
import { CartProvider } from "@/lib/context/CartContext";
import { PresenceBeacon } from "@/components-next/presence-beacon";
import { NabdMark } from "@/components-next/nabd-mark";
import { getDirection, isLocale, locales, type Locale } from "@/lib/i18n";
import { WebMcpLoader } from "@/components-next/web-mcp-loader";
import { pickClientMessages } from "@/lib/i18n/client-messages";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { THEME_INIT_SCRIPT } from "@/app/theme";
import { ModuleRouteGate, ModulesProvider } from "@/components-next/modules/modules-provider";
import { getDisabledModules, getUploadsEnabled } from "@/lib/api/public-config-server";
import { UploadsProvider } from "@/components-next/uploads/uploads-provider";
import { isPathHidden } from "@/lib/modules";
import { ImageFallbackGuard } from "@/components-next/core/image-fallback-guard";
import { BackToTopLoader } from "@/components-next/navigation/back-to-top-loader";
import "@/components-next/navigation/navigation.css";

type Props = Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // the canvas of each theme (generated from tokens.json by tools/design/sync-token-css.mjs)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

// F82: the API and the image CDN are both on the critical path of the home and category pages. Opening them during
// HTML parse removes a full round trip from both the LCP image and the first data fetch.
const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_API_ORIGIN || "https://api.nabd.plus").origin; } catch { return "https://api.nabd.plus"; }
})();

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

/**
 * The root layout of every page. F82-3: it reads no cookie and no header (nothing per visitor and nothing per request),
 * so it never makes a page dynamic: whether a page is static/ISR or dynamic is up to the page. <html lang dir> comes from the
 * locale segment (it used to come from a request header, which made every page dynamic). What depends on the session
 * (account link, sign-out, presence heartbeat) is decided in the browser (lib/auth/session-identity.ts).
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  setRequestLocale(typedLocale);
  // F82-1: only the namespaces client components read go into the HTML (lib/i18n/client-messages.ts).
  const messages = pickClientMessages(await getMessages({ locale: typedLocale }));
  const t = await getTranslations({ locale: typedLocale, namespace: "Shared" });
  // module switches (#953): a public fetch revalidated every 15 s (no cookie, no header, so static/ISR pages stay
  // cacheable), fail-open; hides entry points and stops deep links into a switched-off module
  const disabled = await getDisabledModules();
  const uploadsEnabled = await getUploadsEnabled();
  const moduleCopy = await getTranslations({ locale: typedLocale, namespace: "Modules" });
  const legalLinks = await getTranslations({ locale: typedLocale, namespace: "LegalLinks" });

  return (
    // The nonce server (from the theme cookie) or the theme script (app/theme.ts) sets data-theme, the class and
    // color-scheme on <html> before hydration, so those attributes legitimately differ from the server render.
    <html lang={typedLocale} dir={getDirection(typedLocale)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.nabd.plus" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={apiOrigin} />
        <link rel="dns-prefetch" href="https://cdn.nabd.plus" />
      </head>
      <body className={fontVariables}>
        <NextIntlClientProvider messages={messages}>
          <WebMcpLoader locale={typedLocale} />
          <OfflineSupport />
          <ImageFallbackGuard />
          <WebVitalsReporter locale={typedLocale} />
          <div className="shell" lang={typedLocale} dir={getDirection(typedLocale)}>
            {/* 17.1: the first Tab stop, so a keyboard user can jump past the header to the page. */}
            <a className="skip-link" href="#main-content">{t("skipToContent")}</a>
            {/* P15.4: the offline banner with the time this page was made ("last updated"). For a static/ISR page this
                render is the cached copy, so the time is that copy's, not the visit's. Early in the document so it is read
                first; the banner itself is fixed at the bottom edge. */}
            <OfflineBanner renderedAt={Date.now()} />
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
                <SessionActions locale={typedLocale} accountLabel={t("account")} signOutLabel={t("signOut")} />
              </div>
            </header>
            {/* 17.1: the skip link's target. A sibling, not a wrapper: the :has(> .nabd-…) rules in globals.css need the page root to stay a direct child of .shell. */}
            <span id="main-content" tabIndex={-1} />
            <PresenceBeacon />
            {/* The cart (lib/context/CartContext) was written but never mounted: every "add to cart" on the product pages
                was a no-op. It keeps its items in this browser only, so mounting it here costs no request. */}
            <ModulesProvider disabled={[...disabled]}>
              <UploadsProvider enabled={uploadsEnabled}>
              <CartProvider>
                <ModuleRouteGate locale={typedLocale} title={moduleCopy("unavailableTitle")} body={moduleCopy("unavailableBody")} homeLabel={moduleCopy("unavailableHome")}>
                  {children}
                </ModuleRouteGate>
              </CartProvider>
              </UploadsProvider>
            </ModulesProvider>
            <footer className="site-footer">
              <nav aria-label={t("brand")} className="site-footer__links">
                <Link href={`/${typedLocale}/terms`}>{t("footerTerms")}</Link>
                <Link href={`/${typedLocale}/privacy`}>{t("footerPrivacy")}</Link>
                <Link href={`/${typedLocale}/refund-policy`}>{legalLinks("refundPolicy")}</Link>
                <Link href={`/${typedLocale}/settings/help`}>{t("footerSupport")}</Link>
                {isPathHidden("/articles", disabled) ? null : <Link href={`/${typedLocale}/articles`}>{t("footerArticles")}</Link>}
                <Link href={`/${typedLocale}/map`}>{t("footerMap")}</Link>
              </nav>
            </footer>
            <BackToTopLoader label={t("backToTop")} />
            {/*
              Owner decision 43 a (issue 427): the server writes the theme on <html> from the visitor's cookie (the nonce
              server, server/nonce-transform.mjs stampTheme), so this script is only the fallback for a page that came
              without it, and it sits after the content: an inline script waits for every stylesheet before it runs, and at
              the top of the body that wait held back the content too. It sets BOTH data-theme and .dark (app/theme.ts).

              F82-3: no nonce here. The page HTML is the same for everyone and is cached, so it cannot carry a per-request
              value; the CSP allows exactly this script by its hash (lib/security/csp.ts, THEME_SCRIPT_HASH).
            */}
            <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
