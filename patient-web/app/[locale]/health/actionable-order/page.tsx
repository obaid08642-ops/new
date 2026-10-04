import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { serviceBookHref, type BookableServiceType } from "@/components-next/service-book-link";
import { VectorHealthShield } from "@/components-next/vector-illustrations";

type Props = { params: Promise<{ locale: string }> };
type Item = { service_id: string; name_ar?: string | null; name_en?: string | null };
type Order = { id: string; kind: BookableServiceType; notes?: string | null; status?: string; items: Item[] };

function parseOrders(payload: unknown): Order[] {
  const list = Array.isArray(payload) ? payload : Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  return list.flatMap((raw) => {
    const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    if (!o || typeof o.id !== "string" || !["lab", "radiology", "nursing"].includes(String(o.kind))) return [];
    const items = (Array.isArray(o.items) ? o.items : []).flatMap((x) => {
      const i = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
      return i && typeof i.service_id === "string" ? [{ service_id: i.service_id, name_ar: typeof i.name_ar === "string" ? i.name_ar : null, name_en: typeof i.name_en === "string" ? i.name_en : null }] : [];
    });
    return [{ id: o.id, kind: o.kind as BookableServiceType, notes: typeof o.notes === "string" ? o.notes : null, status: typeof o.status === "string" ? o.status : undefined, items }];
  });
}

/** WP-K: the patient's orders from their doctors (GET /patient/doctor-orders), each linked to its real booking flow. */
export default async function DoctorOrdersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DoctorOrders");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/patient/doctor-orders", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const orders = res.ok ? parseOrders(await res.json().catch(() => null)) : null;
  const name = (i: Item) => (locale === "ar" ? i.name_ar || i.name_en : i.name_en || i.name_ar) || i.service_id;
  const kindLabel = (k: BookableServiceType) => (k === "lab" ? t("kindLab") : k === "radiology" ? t("kindRadiology") : t("kindNursing"));
  const card = { display: "grid", gap: 8, padding: 24, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)" } as const;
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section style={{ ...card, gridTemplateColumns: "1fr auto", alignItems: "center" }}>
        <h1 style={{ color: "#1E332E", margin: 0 }}>{t("title")}</h1>
        <VectorHealthShield size={48} aria-hidden="true" />
      </section>
      {orders === null ? (
        <section style={card} role="alert"><p>{t("unavailable")}</p><RetryButton /></section>
      ) : orders.length === 0 ? (
        <section style={card}><p>{t("empty")}</p></section>
      ) : orders.map((order) => (
        <section key={order.id} style={card} aria-label={kindLabel(order.kind)}>
          <h2 style={{ margin: 0, color: "#1E332E" }}>{kindLabel(order.kind)}</h2>
          {order.notes ? <p dir="auto" style={{ margin: 0 }}>{order.notes}</p> : null}
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
            {order.items.map((item) => (
              <li key={item.service_id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span dir="auto">{name(item)}</span>
                <Link href={serviceBookHref(locale, order.kind, item.service_id, name(item))} style={{ fontWeight: 760, color: "#1E332E" }}>{t("book")}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
