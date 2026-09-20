import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorVitals } from "@/components-next/vector-illustrations";
import { VitalsLogForm } from "@/components-next/vitals-log-form";

type Props = { params: Promise<{ locale: string }> };

export default async function VitalsLogPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

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
          <Link
            href={`/${locale}/health/vitals`}
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
            {ar ? "المؤشرات" : "Vitals"}
          </Link>
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
            {ar ? "تسجيل قراءة" : "Log reading"}
          </h1>
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
          <VectorVitals size={48} aria-hidden="true" />
        </span>
      </section>
      <section
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
        <VitalsLogForm locale={locale} />
      </section>
    </main>
  );
}
