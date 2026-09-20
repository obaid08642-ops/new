import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyMemberRecords, getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { extractFamilyMembers } from "@/lib/api/family";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string; memberRef: string }> };
function list(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export default async function FamilyMemberPage({ params }: Props) {
  const { locale, memberRef } = await params;
  if (!isLocale(locale) || !/^[a-f0-9]{32}$/.test(memberRef)) notFound();
  setRequestLocale(locale);

  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);

  const membersResponse = await getPatientFamilyMembers(token);
  const member = extractFamilyMembers(await membersResponse.json().catch(() => null)).find(
    (x) => familyMemberRef(x.id) === memberRef,
  );
  if (!member) notFound();

  const memberId = member.id;
  const recordsResponse = await getPatientFamilyMemberRecords(token, memberId);
  if (membersResponse.status === 401 || recordsResponse.status === 401) redirect(`/${locale}/login`);
  if (recordsResponse.status === 403 || recordsResponse.status === 404) notFound();
  if (!recordsResponse.ok) notFound();

  const records: any = (await recordsResponse.json().catch(() => null)) || {};
  const t = await getTranslations("Family");
  const AR = locale === "ar" || locale === "ur";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link
        href={`/${locale}/family`}
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
          overflowWrap: "anywhere",
        } as any}
      >
        {AR ? "العودة للعائلة" : "Back to Family"}
      </Link>

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
          <p
            style={{
              color: "#1E332E",
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowWrap: "anywhere",
              fontWeight: 700,
            } as any}
          >
            {AR ? "ملف عائلي مصرح" : "Authorized family profile"}
          </p>
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
            {member.displayName || t("member")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {member.relation ? `${member.relation} · ` : ""}
            {member.role === "owner" ? t("owner") : t("memberRole")}
          </p>
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
          <VectorFamily size={48} aria-hidden="true" />
        </span>
      </section>

      {records.profile ? (
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
            {AR ? "البيانات الأساسية" : "Basic profile"}
          </h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {records.profile.gender ? (
              <span style={{ overflowWrap: "anywhere", color: "#1E332E" } as any}>
                <strong>{AR ? "الجنس:" : "Gender:"}</strong> {records.profile.gender}
              </span>
            ) : null}
            {records.profile.birth_date ? (
              <span style={{ overflowWrap: "anywhere", color: "#1E332E" } as any}>
                <strong>{AR ? "الميلاد:" : "Birth:"}</strong> {records.profile.birth_date}
              </span>
            ) : null}
            {records.profile.blood_type ? (
              <span style={{ overflowWrap: "anywhere", color: "#1E332E" } as any}>
                <strong>{AR ? "فصيلة الدم:" : "Blood type:"}</strong> {records.profile.blood_type}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

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
          {AR ? "الأدوية والوصفات الطبية" : "Medications & Prescriptions"}
        </h2>
        {list(records.meds).length || list(records.prescriptions).length ? (
          <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {[...list(records.meds), ...list(records.prescriptions)].slice(0, 20).map((x: any, i: number) => (
              <li
                key={x.id || i}
                style={{
                  padding: 16,
                  border: "1px solid #E8EDEE",
                  borderRadius: 20,
                  background: "rgba(255,255,255,.82)",
                  overflowWrap: "anywhere",
                } as any}
              >
                <strong style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden", color: "#1E332E" } as any}>
                  {x.medicine_name_ar || x.medicine_name_en || x.doctor_name || (AR ? "وصفة علاجية" : "Prescription")}
                </strong>
                {x.dose ? ` · ${x.dose}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{AR ? "لا توجد أدوية مصرح بمشاركتها حالياً." : "No shared medications available."}</p>
        )}
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
          {AR ? "المواعيد السريرية والاستشارات" : "Appointments"}
        </h2>
        {list(records.appointments).length ? (
          <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {records.appointments.slice(0, 20).map((x: any, i: number) => (
              <li
                key={x.id || i}
                style={{
                  padding: 16,
                  border: "1px solid #E8EDEE",
                  borderRadius: 20,
                  background: "rgba(255,255,255,.82)",
                  overflowWrap: "anywhere",
                } as any}
              >
                <strong style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden", color: "#1E332E" } as any}>
                  {x.doctor_name || (AR ? "استشارة طبية" : "Consultation")}
                </strong>
                <span style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}> · {x.scheduled_at || x.status || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{AR ? "لا توجد مواعيد مصرح بها." : "No shared appointments found."}</p>
        )}
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
          {AR ? "السجلات والتقارير" : "Clinical Reports"}
        </h2>
        <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
          {records.reports
            ? AR
              ? "التقارير الطبية متاحة وفق الصلاحيات الممنوحة من ولي الأمر."
              : "Clinical reports are accessible per authorized parental consent."
            : AR
              ? "لا توجد تقارير طبية مشاركة حالياً."
              : "No shared clinical reports available."}
        </p>
      </section>
    </main>
  );
}
