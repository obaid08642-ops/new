import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { ProgramActions } from "@/components-next/program-actions";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Treatment programs (parity #29): active programs + enroll / complete-session. */
export default async function ProgramsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/medical/programs/active", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const programs: any = res.ok ? await res.json().catch(() => []) : [];
  const list = Array.isArray(programs) ? programs : Array.isArray(programs?.items) ? programs.items : Array.isArray(programs?.programs) ? programs.programs : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><ClipboardList size={18} aria-hidden="true" /> البرامج العلاجية</h1>
      {list.length === 0 ? (
        <Card><p className="text-sm">لا توجد برامج نشطة — انضم من الأدوات أدناه.</p></Card>
      ) : (
        <div className="grid gap-2">
          {list.map((program: any, index: number) => (
            <Card key={`${program.programType ?? program.type ?? index}`}>
              <div className="flex justify-between text-sm">
                <strong>{String(program.programType ?? program.type ?? program.name ?? "").slice(0, 60)}</strong>
                <span>{Number(program.progress_percent ?? program.progress ?? 0)}%</span>
              </div>
              <ProgramActions
                programType={String(program.programType ?? program.type ?? "")}
                sessions={(Array.isArray(program.pending_sessions) ? program.pending_sessions : []).map((s: any) => String(s.id ?? s)).slice(0, 10)}
              />
            </Card>
          ))}
        </div>
      )}

      <h2 className="mt-4 text-lg font-bold">انضم لبرنامج</h2>
      <ProgramActions programType="" sessions={[]} />
    </main>
  );
}
