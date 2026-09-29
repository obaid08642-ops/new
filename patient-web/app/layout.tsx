import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
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
  return <html lang={locale} dir={getDirection(locale)}><body>{children}</body></html>;
}
