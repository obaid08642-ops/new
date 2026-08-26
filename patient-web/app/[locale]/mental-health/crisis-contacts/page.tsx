import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseCrisisContacts } from "@/lib/api/crisis-contacts";
import { getPatientCrisisContacts } from "@/lib/api/crisis-contacts-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../mental-health.module.css";
type Props={params:Promise<{locale:string}>};
export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientCrisisContacts(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("crisisUnavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const contacts=parseCrisisContacts(await response.json().catch(()=>null));return <main className="main"><Link className={styles.back} href={`/${locale}/mental-health`}><ChevronLeft size={17} aria-hidden="true"/>{t("crisisBack")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("crisisEyebrow")}</p><h1>{t("crisisTitle")}</h1><p>{t("crisisNotice")}</p></section>{contacts.length?<section className={styles.grid} aria-label={t("crisisTitle")}>{contacts.map((contact)=><article className={styles.card} key={contact.id}><HeartHandshake size={21} aria-hidden="true"/><strong>{contact.name||t("contactUnavailable")}</strong>{contact.relationship?<span>{contact.relationship}</span>:null}{contact.maskedPhone?<span>{contact.maskedPhone}</span>:null}</article>)}</section>:<section className={styles.state}><HeartHandshake size={25} aria-hidden="true"/><p>{t("crisisEmpty")}</p></section>}</main>}
