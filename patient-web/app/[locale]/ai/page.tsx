import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { TriageForm } from "./triage-form";

type Props = { params: Promise<{ locale: string }> };

export default async function AiTriagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("AiTriage");
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    <p style={{ opacity: 0.75 }}>{t("subtitle")}</p>
    <TriageForm labels={{ placeholder: t("placeholder"), submit: t("submit"), submitting: t("submitting"), error: t("error"), resultTitle: t("resultTitle"), disclaimer: t("disclaimer") }} />
  </main>;
}
