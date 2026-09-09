import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ payload?: string }> };

type OrderPayload = { erx: { name: string; dosage?: string; frequency?: string }[]; labs: { name: string }[]; radiology: { name: string }[] };

function parsePayload(raw: string): OrderPayload {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const meds = (k: string) => (Array.isArray(p[k]) ? p[k] : []).flatMap((x) => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      if (typeof o.name !== "string" || !o.name) return [];
      return [{ name: o.name, dosage: typeof o.dosage === "string" ? o.dosage : undefined, frequency: typeof o.frequency === "string" ? o.frequency : undefined }];
    });
    const named = (k: string) => (Array.isArray(p[k]) ? p[k] : []).flatMap((x) => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      return typeof o.name === "string" && o.name ? [{ name: o.name }] : [];
    });
    return { erx: meds("erx"), labs: named("labs"), radiology: named("radiology") };
  } catch {
    return { erx: [], labs: [], radiology: [] };
  }
}

/** Parity with app actionable-order: post-visit orders rendered from the navigation payload, no backend. */
export default async function ActionableOrderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  const sp = await searchParams;
  const payload = parsePayload((sp.payload || "").trim());
  return (
    <main className="main">
      <Link href={`/${locale}/health`}>{ar ? "صحتي" : "My health"}</Link>
      <h1>{ar ? "أوامر طبية قابلة للتنفيذ" : "Actionable medical orders"}</h1>
      <p role="status">✓ {ar ? "انتهت الاستشارة بنجاح" : "Consultation completed successfully"}</p>
      <section aria-label={ar ? "الوصفة الطبية" : "Prescription"}>
        <h2>{ar ? "الوصفة الطبية" : "Prescription"}</h2>
        {payload.erx.length === 0 ? (
          <p role="status">{ar ? "لا توجد أدوية موصوفة" : "No prescribed medications"}</p>
        ) : (
          <>
            <ul>
              {payload.erx.map((m, i) => (
                <li key={i}><strong>{m.name}</strong>{[m.dosage, m.frequency].filter(Boolean).join(" - ")}</li>
              ))}
            </ul>
            <Link href={`/${locale}/pharmacy`}>{ar ? "اطلب الأدوية الآن" : "Order medicines now"}</Link>
          </>
        )}
      </section>
      {payload.labs.length > 0 ? (
        <section aria-label={ar ? "التحاليل" : "Lab tests"}>
          <h2>{ar ? "التحاليل" : "Lab tests"}</h2>
          <ul>{payload.labs.map((l, i) => <li key={i}>{l.name}</li>)}</ul>
          <Link href={`/${locale}/diagnostics/search`}>{ar ? "حجز زيارة منزلية" : "Book home visit"}</Link>
        </section>
      ) : null}
      {payload.radiology.length > 0 ? (
        <section aria-label={ar ? "طلب أشعة" : "Radiology order"}>
          <h2>{ar ? "طلب أشعة" : "Radiology order"}</h2>
          <ul>{payload.radiology.map((r, i) => <li key={i}>{r.name}</li>)}</ul>
          <Link href={`/${locale}/diagnostics/search`}>{ar ? "استعراض مراكز الأشعة" : "Browse radiology centers"}</Link>
        </section>
      ) : null}
    </main>
  );
}
