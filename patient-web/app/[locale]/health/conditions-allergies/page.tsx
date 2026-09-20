import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import { MedicalProfileListClient, type ProfileItem } from "@/components-next/medical-profile-list-client";

type Props = { params: Promise<{ locale: string }> };

function toItems(value: unknown): ProfileItem[] {
  const list = Array.isArray(value) ? value : (value as { data?: unknown })?.data;
  return (Array.isArray(list) ? list : [])
    .map((v: unknown) => {
      const r = v as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? "");
      if (!id) return null;
      return { id, name: String(r.name ?? "") };
    })
    .filter((v): v is ProfileItem => v !== null);
}

export default async function ConditionsAllergiesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medical-profile", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? ((await response.json().catch(() => null)) as Record<string, unknown> | null) : null;
  const data = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  const lists = [
    { key: "chronic-diseases" as const, title: ar ? "الأمراض المزمنة" : "Chronic diseases", items: toItems(data?.chronic_diseases) },
    { key: "allergies" as const, title: ar ? "الحساسية" : "Allergies", items: toItems(data?.allergies) },
    { key: "surgeries" as const, title: ar ? "العمليات" : "Surgeries", items: toItems(data?.surgeries) },
    { key: "long-term-medications" as const, title: ar ? "أدوية طويلة الأمد" : "Long-term medications", items: toItems(data?.long_term_medications) },
  ];

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
            {ar ? "الحالات والحساسية" : "Conditions & allergies"}
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
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>
      <section style={{ display: "grid", gap: 16 } as any}>
        {lists.map((l) => (
          <div
            key={l.key}
            style={{
              padding: 16,
              border: "1px solid #E8EDEE",
              borderRadius: 20,
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            } as any}
          >
            <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {l.title}
            </h2>
            <MedicalProfileListClient locale={locale} list={l.key} title={l.title} initial={l.items} />
          </div>
        ))}
      </section>
    </main>
  );
}
