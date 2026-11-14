import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { readPublicConfig } from "@/lib/api/public-config-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { HealthTabs } from "@/components-next/health/health-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { FaqList } from "@/components-next/settings/faq-list";
import { FeedbackForm } from "@/components-next/settings/help-forms";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = ["faq", "feedback"] as const;
type Tab = (typeof TABS)[number];
type Faq = { id: string; question: string; answer: string; category: string | null };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function extractFaqs(payload: unknown, locale: Locale): Faq[] {
  const root = asRecord(payload);
  const values = Array.isArray(payload) ? payload : [root?.data, root?.faqs, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  const isAr = locale === "ar";
  return values.flatMap((value) => {
    const r = asRecord(value);
    if (!r) return [];
    // issue 1585: a FAQ may carry question_<locale> for every app language (the built-in fallback does).
    const question = String(r[`question_${locale}`] ?? (isAr ? r.question_ar : r.question_en) ?? r.question_ar ?? r.question_en ?? r.question ?? "");
    const answer = String(r[`answer_${locale}`] ?? (isAr ? r.answer_ar : r.answer_en) ?? r.answer_ar ?? r.answer_en ?? r.answer ?? "");
    const category = typeof r.category === "string" && r.category.trim() ? r.category.trim() : null;
    return question ? [{ id: String(r.id ?? question), question, answer, category }] : [];
  });
}

/**
 * `/settings/help` (merge map section 3 and map 2 "Support"), as the app's: two tabs, `?tab=faq|feedback`. The first has the
 * ways to reach support (the chat, my requests, the support phone) and the FAQ (GET /support/faqs) with its category chips; the
 * second is the feedback form. `/support` and `/settings/feedback` redirect here; an old `?tab=requests` opens the first tab.
 */
export default async function SettingsHelpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.find((item) => item === rawTab) ?? "faq";
  const t = await getTranslations("SettingsWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);

  const frame = (body: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("helpTitle")} backHref={`/${locale}/settings`}>
      <HealthTabs label={t("helpTabs")} base={`/${locale}/settings/help`} active={tab} options={[
        { value: "faq", label: t("tabFaq") }, { value: "feedback", label: t("tabFeedback") },
      ]} />
      {body}
    </ConsultPage>
  );
  const failed = frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  if (tab === "feedback") return frame(<SectionCard id="feedback" title={t("fbTitle")}><FeedbackForm doneHref={`/${locale}/settings`} /></SectionCard>);

  const response = await callPatientApi("/support/faqs", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return failed;
  // The support number comes from GET /config (contact.support_phone), as in the app; no number, no row.
  const config = await readPublicConfig().catch(() => null);
  const rawPhone = (config?.data as { contact?: { support_phone?: unknown } } | null)?.contact?.support_phone;
  const phone = typeof rawPhone === "string" && /^\+?[\d\s-]{5,20}$/.test(rawPhone.trim()) ? rawPhone.trim() : null;
  const faqs = extractFaqs(await response.json().catch(() => null), locale);
  return frame(
    <>
      <SectionCard id="chat" title={t("chatTitle")}>
        <p className={forms.body}>{t("chatBody")}</p>
        <ButtonLink href={`/${locale}/support/chat`} label={t("chatOpen")} fullWidth />
        <ButtonLink href={`/${locale}/support/ticket`} label={t("tabRequests")} variant="outline" fullWidth />
        {phone ? <ButtonLink href={`tel:${phone.replace(/[\s-]/g, "")}`} label={t("callSupport")} variant="outline" fullWidth /> : null}
      </SectionCard>
      <SectionCard id="faq" title={t("faqTitle")}>
        {faqs.length === 0 ? <p className={`${forms.body} ${forms.muted}`}>{t("faqEmpty")}</p> : <FaqList faqs={faqs} label={t("faqTitle")} />}
      </SectionCard>
    </>,
  );
}
