import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorEmergency } from "@/components-next/vector-illustrations";
import { SosActions, type ActiveSos } from "./sos-actions";
import styles from "./emergency.module.css";

type Props = { params: Promise<{ locale: string }> };

function extractActiveSos(payload: unknown): ActiveSos | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const source = root && typeof root.data === "object" ? root.data as Record<string, unknown> : root;
  if (!source || !source.id) return null;
  return {
    id: String(source.id),
    state: typeof source.state === "string" ? source.state : typeof source.status === "string" ? source.status : "TRIGGERED",
    createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
  };
}

export default async function EmergencyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Emergency");
  const response = await callPatientApi("/emergency/my/active", {}, token);
  const active = response.ok ? extractActiveSos(await response.json().catch(() => null)) : null;

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section className={styles.hero} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorEmergency size={48} aria-hidden="true" /></span>
        <span className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}>
          <ShieldAlert size={15} aria-hidden="true" />
          <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? "طوارئ نبض الفورية" : "Nabd Instant SOS"}</span>
        </span>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
        <p className={styles.subtitle} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("subtitle")}</p>
      </section>

      <section style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
      <SosActions
        active={active}
        labels={{
          trigger: t("trigger"),
          triggering: t("triggering"),
          active: t("activeLabel"),
          cancel: t("cancel"),
          cancelling: t("cancelling"),
          error: t("error"),
          state: t("state"),
        }}
      />
      </section>
    </main>
  );
}
