import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { CopyTextButton } from "@/components-next/copy-text-button";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthPassportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const [profileRes, tokenRes] = await Promise.all([
    callPatientApi("/medical-profile", {}, token),
    callPatientApi("/medical-profile/passport-token", {}, token),
  ]);
  if (profileRes.status === 401 || tokenRes.status === 401) redirect(`/${locale}/login`);
  const profile = profileRes.ok ? await profileRes.json().catch(() => null) : null;
  const passport = tokenRes.ok ? await tokenRes.json().catch(() => null) : null;
  const data = (profile as { data?: unknown })?.data ?? profile;
  const passportToken =
    typeof (passport as { token?: unknown })?.token === "string"
      ? (passport as { token?: string }).token
      : typeof (passport as { data?: { token?: unknown } })?.data?.token === "string"
        ? ((passport as { data?: { token?: string } }).data as { token?: string }).token
        : null;
  const name = (data as { full_name?: unknown; name?: unknown })?.full_name ?? (data as { name?: unknown })?.name;

  return (
    <main className="main">
      <Link href={`/${locale}/health/reports`}>{ar ? "التقارير" : "Reports"}</Link>
      <h1>{ar ? "جوازي الصحي" : "My health passport"}</h1>
      {typeof name === "string" ? <p><strong>{name}</strong></p> : null}
      {passportToken ? (
        <section aria-label={ar ? "رمز المشاركة" : "Share token"}>
          <p>{ar ? "اعرض هذا الرمز لمقدم الرعاية لمشاركة ملفك:" : "Show this token to your provider to share your file:"}</p>
          <code dir="ltr" style={{ overflowWrap: "anywhere" }}>{passportToken}</code>
          <CopyTextButton text={passportToken} locale={locale} />
        </section>
      ) : (
        <p role="alert">{ar ? "تعذر إصدار رمز المشاركة حالياً." : "Could not issue a share token right now."}</p>
      )}
    </main>
  );
}
