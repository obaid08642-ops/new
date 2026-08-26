import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// X12: document-level lang/dir now follows the ACTUAL locale (ar/ur → rtl,
// en/hi/bn/fil → ltr) instead of the previous hardcoded ar/rtl — an a11y and
// SEO defect affecting every non-Arabic page render.
const RTL = new Set(["ar", "ur"]);

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let locale = "ar";
  try { locale = (await getLocale()) || "ar"; } catch {}
  const dir = RTL.has(locale) ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
