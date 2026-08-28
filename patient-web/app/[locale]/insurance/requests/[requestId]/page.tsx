import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { getPatientInsuranceRequest } from "@/lib/api/insurance-server";
import { parseInsuranceRequest } from "@/lib/api/insurance-request";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultationInsuranceDecision } from "@/components-next/consultation-insurance-decision";
import styles from "../../insurance.module.css";

type Props = { params: Promise<{ locale: string; requestId: string }> };
export default async function InsuranceRequestPage({ params }: Props) {
  const { locale, requestId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) notFound();
  setRequestLocale(locale); const t = await getTranslations("Insurance"); const token = await requirePatientAccess(locale);
  const response = await getPatientInsuranceRequest(token, requestId);
  if (response.status === 401) redirect(`/${locale}/login`); if (response.status === 403 || response.status === 404) notFound();
  const request = response.ok ? parseInsuranceRequest(await response.json().catch(() => null)) : null;
  if (!request) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  return <main className="main"><Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />العودة إلى الموعد</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />التأمين</p><h1>قرار تغطية الاستشارة</h1><p>تُعرض النتيجة وخيارات الدفع من الحالة الخادمية المملوكة فقط.</p></section><ConsultationInsuranceDecision request={request} /></main>;
}
