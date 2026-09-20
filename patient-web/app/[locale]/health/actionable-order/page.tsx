import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorHealthShield } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ payload?: string }> };

type OrderPayload = { erx: { name: string; dosage?: string; frequency?: string }[]; labs: { name: string }[]; radiology: { name: string }[] };

function parsePayload(raw: string): OrderPayload {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const meds = (k: string) =>
      (Array.isArray(p[k]) ? p[k] : []).flatMap((x) => {
        if (!x || typeof x !== "object") return [];
        const o = x as Record<string, unknown>;
        if (typeof o.name !== "string" || !o.name) return [];
        return [{ name: o.name, dosage: typeof o.dosage === "string" ? o.dosage : undefined, frequency: typeof o.frequency === "string" ? o.frequency : undefined }];
      });
    const named = (k: string) =>
      (Array.isArray(p[k]) ? p[k] : []).flatMap((x) => {
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
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 } as any}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {ar ? "أوامر طبية قابلة للتنفيذ" : "Actionable medical orders"}
          </h1>
          <p
            role="status"
            style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}
          >
            ✓ {ar ? "انتهت الاستشارة بنجاح" : "Consultation completed successfully"}
          </p>
          <Link
            href={`/${locale}/health`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              width: "fit-content",
              overflowWrap: "anywhere",
            } as any}
          >
            {ar ? "صحتي" : "My health"}
          </Link>
        </div>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(95,217,179,.12)",
            border: "1px solid #E8EDEE",
            flex: "0 0 auto",
          } as any}
        >
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>

      <section
        aria-label={ar ? "الوصفة الطبية" : "Prescription"}
        style={{
          display: "grid",
          gap: 16,
          padding: 16,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <h2
          style={{
            color: "#1E332E",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2 as any,
            WebkitBoxOrient: "vertical" as any,
            overflow: "hidden",
          } as any}
        >
          {ar ? "الوصفة الطبية" : "Prescription"}
        </h2>
        {payload.erx.length === 0 ? (
          <p role="status" style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
            {ar ? "لا توجد أدوية موصوفة" : "No prescribed medications"}
          </p>
        ) : (
          <>
            <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
              {payload.erx.map((m, i) => (
                <li
                  key={i}
                  style={{
                    padding: 16,
                    border: "1px solid #E8EDEE",
                    borderRadius: 20,
                    background: "rgba(255,255,255,.82)",
                    overflowWrap: "anywhere",
                    color: "#1E332E",
                  } as any}
                >
                  <strong style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
                    {m.name}
                  </strong>
                  {[m.dosage, m.frequency].filter(Boolean).join(" - ")}
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/pharmacy`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#5FD9B3",
                color: "#1E332E",
                fontWeight: 700,
                textDecoration: "none",
                width: "fit-content",
                overflowWrap: "anywhere",
              } as any}
            >
              {ar ? "اطلب الأدوية الآن" : "Order medicines now"}
            </Link>
          </>
        )}
      </section>
      {payload.labs.length > 0 ? (
        <section
          aria-label={ar ? "التحاليل" : "Lab tests"}
          style={{
            display: "grid",
            gap: 16,
            padding: 16,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          } as any}
        >
          <h2
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {ar ? "التحاليل" : "Lab tests"}
          </h2>
          <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {payload.labs.map((l, i) => (
              <li key={i} style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", overflowWrap: "anywhere", color: "#1E332E" } as any}>
                {l.name}
              </li>
            ))}
          </ul>
          <Link
            href={`/${locale}/diagnostics/search`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              width: "fit-content",
              overflowWrap: "anywhere",
            } as any}
          >
            {ar ? "حجز زيارة منزلية" : "Book home visit"}
          </Link>
        </section>
      ) : null}
      {payload.radiology.length > 0 ? (
        <section
          aria-label={ar ? "طلب أشعة" : "Radiology order"}
          style={{
            display: "grid",
            gap: 16,
            padding: 16,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          } as any}
        >
          <h2
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {ar ? "طلب أشعة" : "Radiology order"}
          </h2>
          <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {payload.radiology.map((r, i) => (
              <li key={i} style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", overflowWrap: "anywhere", color: "#1E332E" } as any}>
                {r.name}
              </li>
            ))}
          </ul>
          <Link
            href={`/${locale}/diagnostics/search`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              width: "fit-content",
              overflowWrap: "anywhere",
            } as any}
          >
            {ar ? "استعراض مراكز الأشعة" : "Browse radiology centers"}
          </Link>
        </section>
      ) : null}
    </main>
  );
}
