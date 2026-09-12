import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Phone, Siren, UserRound, UsersRound } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientFamilyEmergencyContacts } from "@/lib/api/family-server";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

type EmergencyContact = { user_id?: string; display_name?: string | null; phone?: string | null; relation?: string | null };

function extractContacts(payload: unknown): EmergencyContact[] {
  if (Array.isArray(payload)) return payload as EmergencyContact[];
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const values = [root?.data, root?.contacts, root?.items].find(Array.isArray);
  return Array.isArray(values) ? (values as EmergencyContact[]) : [];
}

export default async function FamilyEmergencyContactsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = await getTranslations("Family");
  const token = await requirePatientAccess(locale);
  const response = await getPatientFamilyEmergencyContacts(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <Siren size={25} aria-hidden="true" />
          <h1>{ar ? "تعذر تحميل جهات الطوارئ" : "Could not load emergency contacts"}</h1>
          <RetryButton />
        </section>
      </main>
    );
  }
  const contacts = extractContacts(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/family`}>
        {ar ? "العائلة" : "Family"}
      </Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>
            <Siren size={15} aria-hidden="true" />
            {ar ? "جهات الطوارئ" : "Emergency contacts"}
          </p>
          <h1>{ar ? `جهات الطوارئ (${contacts.length})` : `Emergency contacts (${contacts.length})`}</h1>
          <p>{ar ? "عند طلب SOS سيتم إشعار أفراد عائلتك فوراً مع موقعك الحالي." : "Requesting SOS notifies your family immediately with your live location."}</p>
        </div>
      </section>
      {contacts.length === 0 ? (
        <section className={styles.state}>
          <UsersRound size={25} aria-hidden="true" />
          <p>{ar ? "لا يوجد أفراد في مجموعتك العائلية بعد — ادعُ عائلتك ليصبحوا جهات طوارئ." : "Nobody in your family group yet — invite them to become emergency contacts."}</p>
          <Link className={styles.notice} href={`/${locale}/family/invite`}>{ar ? "دعوة فرد للعائلة" : "Invite someone"}</Link>
        </section>
      ) : (
        <section className={styles.grid} aria-label={ar ? "جهات الطوارئ" : "Emergency contacts"}>
          {contacts.map((c) => (
            <article className={styles.card} key={c.user_id || c.phone || c.display_name}>
              <span className={styles.cardIcon}><UserRound size={19} aria-hidden="true" /></span>
              <div className={styles.cardBody}>
                <strong className={styles.member}>{c.display_name || t("member")}</strong>
                <span className={styles.role}>{c.relation || c.phone || (ar ? "لا يوجد رقم مسجّل" : "No phone on file")}</span>
              </div>
              {c.phone ? (
                <a className={styles.notice} href={`tel:${encodeURIComponent(c.phone)}`}>
                  <Phone size={15} aria-hidden="true" /> {ar ? "اتصال" : "Call"}
                </a>
              ) : null}
            </article>
          ))}
        </section>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link className={styles.notice} href={`/${locale}/family/invite`}>{ar ? "دعوة فرد للعائلة" : "Invite someone"}</Link>
        <Link className={styles.notice} href={`/${locale}/emergency/sos`}>{ar ? "طلب طوارئ SOS" : "Request SOS"}</Link>
      </div>
    </main>
  );
}
