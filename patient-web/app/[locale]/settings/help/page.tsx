import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { HealthTabs } from "@/components-next/health/health-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { FeedbackForm, NewRequestForm } from "@/components-next/settings/help-forms";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/settings/settings.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = ["faq", "requests", "feedback"] as const;
type Tab = (typeof TABS)[number];
type Faq = { id: string; question: string; answer: string };
type Ticket = { id: string; subject: string; status: string };

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
    const question = String((isAr ? r.question_ar : r.question_en) ?? r.question_ar ?? r.question_en ?? r.question ?? "");
    const answer = String((isAr ? r.answer_ar : r.answer_en) ?? r.answer_ar ?? r.answer_en ?? r.answer ?? "");
    return question ? [{ id: String(r.id ?? question), question, answer }] : [];
  });
}

function extractTickets(payload: unknown): Ticket[] {
  const root = asRecord(payload);
  const values = Array.isArray(payload) ? payload : [root?.data, root?.requests, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = asRecord(value);
    if (!r || !r.id) return [];
    return [{ id: String(r.id), subject: String(r.subject ?? r.title ?? r.category ?? ""), status: String(r.status ?? "open") }];
  });
}

/**
 * `/settings/help` (merge map section 3 and map 2 "Support"): three tabs, `?tab=faq|requests|feedback`. The FAQ
 * (GET /support/faqs) with the way to the support chat; the patient's requests (GET /support/requests/mine) with the form to
 * send one; and the feedback form. `/support` and `/settings/feedback` redirect here.
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
        { value: "faq", label: t("tabFaq") }, { value: "requests", label: t("tabRequests") }, { value: "feedback", label: t("tabFeedback") },
      ]} />
      {body}
    </ConsultPage>
  );
  const failed = frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  if (tab === "feedback") return frame(<SectionCard id="feedback" title={t("fbTitle")}><FeedbackForm /></SectionCard>);

  if (tab === "requests") {
    const response = await callPatientApi("/support/requests/mine", {}, token);
    if (response.status === 401) redirect(`/${locale}/login`);
    if (!response.ok) return failed;
    const tickets = extractTickets(await response.json().catch(() => null));
    return frame(
      <>
        <SectionCard id="mine" title={t("requestsTitle")}>
          {tickets.length === 0 ? <p className={`${forms.body} ${forms.muted}`}>{t("requestsEmpty")}</p> : (
            <ul className={styles.list} aria-label={t("requestsTitle")}>
              {tickets.map((ticket) => (
                <li key={ticket.id} className={styles.itemRow}>
                  <span className={styles.itemText}><span className={styles.itemTitle}>{ticket.subject || ticket.id}</span></span>
                  <StatusChip label={ticket.status} tone="ink" />
                </li>
              ))}
            </ul>
          )}
          <ButtonLink href={`/${locale}/support/ticket`} label={t("requestsAll")} variant="outline" fullWidth />
        </SectionCard>
        <SectionCard id="new" title={t("requestNewTitle")}><NewRequestForm /></SectionCard>
      </>,
    );
  }

  const response = await callPatientApi("/support/faqs", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return failed;
  const faqs = extractFaqs(await response.json().catch(() => null), locale);
  return frame(
    <>
      <SectionCard id="chat" title={t("chatTitle")}>
        <p className={forms.body}>{t("chatBody")}</p>
        <ButtonLink href={`/${locale}/support/chat`} label={t("chatOpen")} fullWidth />
      </SectionCard>
      <SectionCard id="faq" title={t("faqTitle")}>
        {faqs.length === 0 ? <p className={`${forms.body} ${forms.muted}`}>{t("faqEmpty")}</p> : (
          <div>
            {faqs.map((faq) => (
              <details key={faq.id} className={styles.faq}>
                <summary><span>{faq.question}</span><Icon name="caret-down" size={16} tone="secondary" /></summary>
                {faq.answer ? <p className={styles.faqAnswer}>{faq.answer}</p> : null}
              </details>
            ))}
          </div>
        )}
      </SectionCard>
    </>,
  );
}
