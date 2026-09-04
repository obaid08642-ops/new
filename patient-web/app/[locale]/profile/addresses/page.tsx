import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { AddressList, AddAddressForm } from "@/components-next/addresses";
import { VectorMap } from "@/components-next/vector-illustrations";
import { ChevronLeft, MapPin } from "lucide-react";
import styles from "../profile.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Addresses" });
  const canonical = localizedUrl(locale, "/profile/addresses");
  return {
    title: t("title"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/profile/addresses")])), "x-default": localizedUrl("ar", "/profile/addresses") },
    },
    robots: { index: false, follow: false },
  };
}

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Addresses");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const addresses = response.ok
    ? ((await response.json().catch(() => null))?.addresses ?? [])
    : [];
  const isAr = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link
        href={`/${locale}/profile`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--brand-deep)",
          fontWeight: 750,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={17} aria-hidden="true" />
        {isAr ? "العودة للملف الشخصي" : "Back to Profile"}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <MapPin size={15} aria-hidden="true" />
            {isAr ? "العناوين ومواقع التوصيل" : "Delivery Locations"}
          </p>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className={styles.heroVector}>
          <VectorMap size={75} />
        </div>
      </section>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        <AddressList addresses={addresses} locale={locale} />
        <AddAddressForm />
      </div>
    </main>
  );
}
