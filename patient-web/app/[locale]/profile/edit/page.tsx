import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ProfileEditForm } from "@/components-next/profile-edit-form";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfileEditPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medical-profile", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const raw = response.ok ? ((await response.json().catch(() => null)) as Record<string, unknown> | null) : null;
  const data = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  return (
    <main className="main">
      <Link href={`/${locale}/profile`}>{ar ? "الملف الشخصي" : "Profile"}</Link>
      <h1>{ar ? "تعديل الملف الصحي" : "Edit health profile"}</h1>
      <ProfileEditForm
        locale={locale}
        initial={{ height_cm: num(data?.height_cm), weight_kg: num(data?.weight_kg), blood_type: str(data?.blood_type) }}
      />
    </main>
  );
}
