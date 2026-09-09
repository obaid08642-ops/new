import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { FamilyPermissionRequestsClient } from "@/components-next/family-permission-requests-client";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPermissionRequestsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/family/permissions/pending", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  const requests = (Array.isArray(list) ? list : []).map((r: unknown) => {
    const v = r as Record<string, unknown>;
    const id = String(v.id ?? v._id ?? v.request_id ?? "");
    if (!id) return null;
    const perms = Array.isArray(v.permissions) ? v.permissions.filter((p): p is string => typeof p === "string") : [];
    return {
      id,
      memberName: typeof v.member_name === "string" ? v.member_name : typeof v.requester_name === "string" ? v.requester_name : undefined,
      permissions: perms,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="main">
      <Link href={`/${locale}/family/permissions`}>{ar ? "الأذونات" : "Permissions"}</Link>
      <h1>{ar ? "طلبات الأذونات المعلقة" : "Pending permission requests"}</h1>
      <FamilyPermissionRequestsClient locale={locale} requests={requests} />
    </main>
  );
}
