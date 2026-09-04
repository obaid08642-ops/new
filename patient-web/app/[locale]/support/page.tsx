import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { SupportClient, type SupportFaq, type SupportTicket } from "./support-client";
import { VectorSupport } from "@/components-next/vector-illustrations";
import { Headphones, HelpCircle, LifeBuoy } from "lucide-react";
import styles from "./support.module.css";

type Props = { params: Promise<{ locale: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function extractFaqs(payload: unknown, locale: string): SupportFaq[] {
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

function extractTickets(payload: unknown): SupportTicket[] {
  const root = asRecord(payload);
  const values = Array.isArray(payload) ? payload : [root?.data, root?.requests, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = asRecord(value);
    if (!r || !r.id) return [];
    return [{
      id: String(r.id),
      subject: String(r.subject ?? r.title ?? r.category ?? ""),
      status: String(r.status ?? "open"),
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Support");
  const isAr = locale === "ar";

  const [faqsResponse, ticketsResponse] = await Promise.all([
    callPatientApi("/support/faqs", {}, token),
    callPatientApi("/support/requests/mine", {}, token),
  ]);

  const faqs = faqsResponse.ok ? extractFaqs(await faqsResponse.json().catch(() => null), locale) : [];
  const tickets = ticketsResponse.ok ? extractTickets(await ticketsResponse.json().catch(() => null)) : [];

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Headphones size={15} aria-hidden="true" />
            {isAr ? "مركز العناية بالمريض" : "Patient Support Center"}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {isAr
              ? "فريق الدعم الفني والرعاية السريرية متاح لخدمتك على مدار الساعة للإجابة على استفساراتك ومساعدتك."
              : "Our dedicated care and tech team is here 24/7 to answer your questions and assist you."}
          </p>
        </div>
        <div className={styles.heroIllustration}>
          <VectorSupport size={80} />
        </div>
      </section>

      <SupportClient
        faqs={faqs}
        tickets={tickets}
        labels={{
          faqTitle: t("faqTitle"),
          ticketsTitle: t("ticketsTitle"),
          noTickets: t("noTickets"),
          subjectPlaceholder: t("subjectPlaceholder"),
          messagePlaceholder: t("messagePlaceholder"),
          send: t("send"),
          sending: t("sending"),
          sent: t("sent"),
          error: t("error"),
        }}
      />
    </main>
  );
}
