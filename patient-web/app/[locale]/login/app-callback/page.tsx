import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCallback } from "@/components-next/app-callback";
import { appCallbackTarget } from "@/lib/auth/app-callback";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string | string[]; state?: string | string[]; error?: string | string[] }> };

// The query carries a one-time authorization code: never send it onward in a Referer header, never index the page.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "AppCallback" });
  return { title: t("title"), referrer: "no-referrer", robots: { index: false, follow: false } };
}

/** The HTTPS redirect URI the app gives Snapchat (which refuses `nabdplus://`): hands { code, state } to the app's scheme, nowhere else. */
export default async function AppCallbackPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "AppCallback" });
  const target = appCallbackTarget(await searchParams);
  if (!target) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24, textAlign: "center" }}>
        <p>{t("invalid")}</p>
      </main>
    );
  }
  return <AppCallback target={target} title={t("title")} openLabel={t("open")} />;
}
