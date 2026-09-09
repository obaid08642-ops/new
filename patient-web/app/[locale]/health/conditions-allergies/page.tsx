import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { MedicalProfileListClient, type ProfileItem } from "@/components-next/medical-profile-list-client";

type Props = { params: Promise<{ locale: string }> };

function toItems(value: unknown): ProfileItem[] {
  const list = Array.isArray(value) ? value : (value as { data?: unknown })?.data;
  return (Array.isArray(list) ? list : []).map((v: unknown) => {
    const r = v as Record<string, unknown>;
    const id = String(r.id ?? r._id ?? "");
    if (!id) return null;
    return { id, name: String(r.name ?? "") };
  }).filter((v): v is ProfileItem => v !== null);
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
    <main className="main">
      <Link href={`/${locale}/health`}>{ar ? "صحتي" : "My health"}</Link>
      <h1>{ar ? "الحالات والحساسية" : "Conditions & allergies"}</h1>
      {lists.map((l) => (
        <MedicalProfileListClient key={l.key} locale={locale} list={l.key} title={l.title} initial={l.items} />
      ))}
    </main>
  );
}
