// F2 (PRODUCT.md): Nabd+ does not approve claims. GET /insurance/coverage-check
// answers whether providers accept the patient's insurer; GET
// /insurance/benefits-summary lists the patient's insurance requests per
// service as the providers decided them. These helpers turn those responses
// into display text without inventing anything.

export const COVERAGE_SERVICE_TYPES = ["consultation", "pharmacy", "lab", "radiology", "nursing"] as const;
export type CoverageServiceType = (typeof COVERAGE_SERVICE_TYPES)[number];

const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {
  consultation: { ar: "استشارات", en: "Consultations" },
  pharmacy: { ar: "صيدلية", en: "Pharmacy" },
  lab: { ar: "تحاليل", en: "Lab tests" },
  radiology: { ar: "أشعة", en: "Radiology" },
  nursing: { ar: "تمريض منزلي", en: "Home nursing" },
};

const REASONS: Record<string, { ar: string; en: string }> = {
  no_insurance_policy: { ar: "لا توجد وثيقة تأمين مسجلة في ملفك", en: "No insurance policy is saved on your profile" },
  insurance_company_not_in_catalog: { ar: "شركة التأمين في وثيقتك غير موجودة في قائمة الشركات", en: "Your policy's insurer is not in the insurer list" },
  no_provider_accepts_company: { ar: "لا يوجد حالياً مقدم خدمة لهذه الخدمة يقبل تأمينك", en: "No provider of this service accepts your insurer yet" },
  provider_does_not_accept_company: { ar: "مقدم الخدمة لا يقبل شركة تأمينك", en: "This provider does not accept your insurer" },
};

export function serviceLabel(service: string, locale: string): string {
  const l = SERVICE_LABELS[service];
  return l ? (locale === "ar" ? l.ar : l.en) : service;
}

export interface CoverageView {
  covered: boolean;
  title: string;
  company: string | null;
  reason: string | null;
  acceptingProviders: number | null;
}

export function coverageView(result: unknown, service: string, locale: string): CoverageView | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { covered?: unknown; accepting_providers?: unknown; reason?: unknown; company?: { name_ar?: string; name_en?: string } };
  const covered = r.covered === true;
  const count = typeof r.accepting_providers === "number" ? r.accepting_providers : null;
  const company = (locale === "ar" ? r.company?.name_ar || r.company?.name_en : r.company?.name_en || r.company?.name_ar) || null;
  const reasonKey = typeof r.reason === "string" ? r.reason : null;
  const reason = reasonKey ? (REASONS[reasonKey] ? (locale === "ar" ? REASONS[reasonKey].ar : REASONS[reasonKey].en) : reasonKey) : null;
  const svc = serviceLabel(service, locale);
  const title = covered
    ? count != null
      ? locale === "ar" ? `${count} مقدم خدمة يقبل تأمينك في ${svc}` : `${count} ${svc} provider(s) accept your insurer`
      : locale === "ar" ? "مقدم الخدمة يقبل تأمينك" : "This provider accepts your insurer"
    : locale === "ar" ? "لا يوجد قبول لتأمينك" : "Your insurer is not accepted";
  return { covered, title, company, reason: covered ? null : reason, acceptingProviders: count };
}

export interface BenefitRow {
  service: string;
  requests: number;
  approved: number;
  partiallyApproved: number;
  rejected: number;
  pending: number;
  copayPaid: number;
  copayDue: number;
}

export function benefitRows(data: unknown): BenefitRow[] {
  if (!Array.isArray(data)) return [];
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as { service?: unknown }).service === "string")
    .map((r) => ({
      service: String(r.service),
      requests: n(r.requests),
      approved: n(r.approved),
      partiallyApproved: n(r.partially_approved),
      rejected: n(r.rejected),
      pending: n(r.pending),
      copayPaid: n(r.copay_paid),
      copayDue: n(r.copay_due),
    }));
}
