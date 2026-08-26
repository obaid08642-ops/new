import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Siren } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { SosControls } from "@/components-next/sos-controls";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Emergency SOS (parity #30): active-request check + real trigger/cancel. */
export default async function EmergencyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/emergency/my/active", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const data: any = res.ok ? await res.json().catch(() => null) : null;
  const active = data && typeof data === "object" && !Array.isArray(data) ? data : Array.isArray(data) ? data[0] : null;
  const activeId = active && String(active.id || "") ? String(active.id) : undefined;

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Siren size={18} aria-hidden="true" /> طوارئ</h1>
      <Card>
        <p className="text-sm mb-3">
          في خطر مباشر؟ اتصل بـ 997 فورًا. النداء عبر النبض+ يرسل موقعك وحالتك لفريق العمليات ويسنح لك بتتبع الإسعاف.
        </p>
        <SosControls activeId={activeId} />
      </Card>
    </main>
  );
}
