import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { FamilyPermissionsClient } from "@/components-next/family-permissions-client";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPermissionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/family/my-group", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const group = (raw as { data?: unknown })?.data ?? raw;
  const list = (group as { members?: unknown })?.members;
  const members = (Array.isArray(list) ? list : []).map((m: unknown) => {
    const r = m as Record<string, unknown>;
    const id = String(r.user_id ?? r.userId ?? r.id ?? r._id ?? "");
    if (!id) return null;
    const perms = Array.isArray(r.permissions) ? r.permissions.filter((p): p is string => typeof p === "string") : [];
    return {
      id,
      name: String(r.display_name ?? r.name ?? r.full_name ?? (ar ? "عضو" : "Member")),
      permissions: perms,
    };
  }).filter((m): m is { id: string; name: string; permissions: string[] } => m !== null);

  return (
    <main className="main">
      <Link href={`/${locale}/family`}>{ar ? "العائلة" : "Family"}</Link>
      <h1>{ar ? "أذونات الأعضاء" : "Member permissions"}</h1>
      <FamilyPermissionsClient locale={locale} members={members} />
      <Link href={`/${locale}/family/permission-requests`}>{ar ? "طلبات الأذونات" : "Permission requests"}</Link>
    </main>
  );
}
