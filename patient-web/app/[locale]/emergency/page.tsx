import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { SosActions, type ActiveSos } from "./sos-actions";

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
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
    <h1>{t("title")}</h1>
    <p style={{ opacity: 0.75 }}>{t("subtitle")}</p>
    <SosActions
      active={active}
      labels={{
        trigger: t("trigger"), triggering: t("triggering"), active: t("activeLabel"),
        cancel: t("cancel"), cancelling: t("cancelling"), error: t("error"), state: t("state"),
      }}
    />
  </main>;
}
