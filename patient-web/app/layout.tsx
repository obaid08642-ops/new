import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
// DEVICE_STANDARD §1 web shells (<AppShell>, <StickyFooter>), mirrored from packages/ui/shells.
import "@/components-next/ui-generated/shells/shells.css";
import "@/components-next/ui-generated/components/components.css";
import { getDirection, isLocale } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#1E332E",
};

// <html lang/dir> must match the page locale: search engines read the language from <html>, and
// hard-coding "ar"/"rtl" declared every en/ur/hi/bn/fil page as Arabic. next-intl's middleware
// passes the resolved locale on the request; routes outside [locale] fall back to Arabic.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requested = (await headers()).get("x-next-intl-locale") || "";
  const locale = isLocale(requested) ? requested : "ar";
  // F82: the API and the image CDN are both on the critical path of the home and
  // category pages. Opening them during HTML parse removes a full round trip from
  // both the LCP image and the first data fetch.
  const apiOrigin = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_API_ORIGIN || "https://api.nabd.plus").origin; } catch { return "https://api.nabd.plus"; }
  })();

  return (
    // The theme script (app/theme.ts) sets data-theme, the class and color-scheme on <html> before
    // hydration, so those attributes legitimately differ from the server render.
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.nabd.plus" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={apiOrigin} />
        <link rel="dns-prefetch" href="https://cdn.nabd.plus" />
      </head>
      <body>{children}</body>
    </html>
  );
}
