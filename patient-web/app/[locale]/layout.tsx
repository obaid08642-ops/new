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
import { WebMcpLoader } from "@/components-next/web-mcp-loader";
import { pickClientMessages } from "@/lib/i18n/client-messages";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { THEME_INIT_SCRIPT } from "@/app/theme";
import { ServiceWorkerRegister } from "@/components-next/service-worker-register";

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
  // F82-1: only the namespaces client components read go into the HTML (lib/i18n/client-messages.ts).
  const messages = pickClientMessages(await getMessages({ locale: typedLocale }));
  const t = await getTranslations({ locale: typedLocale, namespace: "Shared" });
  const hasAccessToken = Boolean((await cookies()).get(authCookieNames.access)?.value);
  // proxy.ts puts the per-request CSP nonce here; an inline script without it is refused.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <NextIntlClientProvider messages={messages}>
      <WebMcpLoader locale={typedLocale} />
      <div className={`shell ${fontVariables}`} lang={typedLocale} dir={getDirection(typedLocale)}>
        {/*
          12.A3 — the theme has to be known before the first pixel, or every
          navigation flashes the wrong theme. This is a synchronous inline script
          at the top of the body for that reason; see app/theme.ts for why it
          sets BOTH data-theme and .dark.
        */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
        <footer className="site-footer">
          <nav aria-label={t("brand")} className="site-footer__links">
            <Link href={`/${typedLocale}/terms`}>{t("footerTerms")}</Link>
            <Link href={`/${typedLocale}/privacy`}>{t("footerPrivacy")}</Link>
            <Link href={`/${typedLocale}/support`}>{t("footerSupport")}</Link>
            <Link href={`/${typedLocale}/articles`}>{t("footerArticles")}</Link>
            <Link href={`/${typedLocale}/map`}>{t("footerMap")}</Link>
          </nav>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
