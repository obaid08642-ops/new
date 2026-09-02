import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { Calendar, HeartHandshake, Mic, Pill, ShieldAlert, Sparkles, Stethoscope, TestTube2 } from "lucide-react";
import styles from "./voice.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "VoiceAssistant" });
  const canonical = localizedUrl(locale, "/voice");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/voice")])),
        "x-default": localizedUrl("ar", "/voice"),
      },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function VoiceAssistantPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("VoiceAssistant");

  const actions = [
    {
      icon: Stethoscope,
      title: t("actionDoctor"),
      category: t("catConsultation"),
      href: `/${locale}/consultations/doctors`,
      danger: false,
    },
    {
      icon: Pill,
      title: t("actionPharmacy"),
      category: t("catPharmacy"),
      href: `/${locale}/medicines`,
      danger: false,
    },
    {
      icon: TestTube2,
      title: t("actionLabs"),
      category: t("catLabs"),
      href: `/${locale}/diagnostics/labs`,
      danger: false,
    },
    {
      icon: HeartHandshake,
      title: t("actionNursing"),
      category: t("catNursing"),
      href: `/${locale}/nursing/catalog`,
      danger: false,
    },
    {
      icon: Calendar,
      title: t("actionAppointments"),
      category: t("catAppointments"),
      href: `/${locale}/appointments`,
      danger: false,
    },
    {
      icon: Sparkles,
      title: t("actionTriage"),
      category: t("catAI"),
      href: `/${locale}/ai`,
      danger: false,
    },
    {
      icon: ShieldAlert,
      title: t("actionEmergency"),
      category: t("catEmergency"),
      href: `/${locale}/emergency`,
      danger: true,
    },
  ];

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.iconCircle}>
          <Mic size={32} aria-hidden="true" />
        </div>
        <h1>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.notice}>{t("voiceNotice")}</div>
      </section>

      <section className={styles.grid}>
        {actions.map((act, index) => {
          const IconComponent = act.icon;
          return (
            <Link
              key={index}
              href={act.href}
              className={`${styles.card} ${act.danger ? styles.dangerCard : ""}`}
            >
              <div className={`${styles.cardIcon} ${act.danger ? styles.dangerIcon : ""}`}>
                <IconComponent size={24} aria-hidden="true" />
              </div>
              <div className={styles.cardContent}>
                <strong>{act.title}</strong>
                <small>{act.category}</small>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
