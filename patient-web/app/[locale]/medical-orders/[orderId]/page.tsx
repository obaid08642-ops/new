import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { loadItem } from "@/lib/ordering/load-item";
import { formatDate } from "@/lib/format-date";
import { groupFlowHref, orderOf, type MedicalOrderItem, type OrderGroupKey } from "@/lib/medical-orders/medical-orders";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Hero, Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { OrderFormButton } from "@/components-next/medical-orders/order-form-button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import styles from "@/components-next/medical-orders/medical-orders.module.css";

type Props = { params: Promise<{ locale: string; orderId: string }>; searchParams?: Promise<{ error?: string }> };
const ID = /^[A-Za-z0-9-]{8,64}$/;
const GROUPS: OrderGroupKey[] = ["labs", "radiology", "nursing", "prescription"];

/** M6 Ord21 "تفاصيل الأمر الطبي": the groups, the Order button per group, and "later" per item. GET /medical-orders/:id. */
export default async function MedicalOrderPage({ params, searchParams }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !ID.test(orderId)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const t = await getTranslations("MedicalOrders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/medical-orders/${encodeURIComponent(orderId)}`, { cache: "no-store" }, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 404 || response.status === 403) notFound();
  const backHref = `/${locale}/medical-orders`;
  const order = response.ok ? orderOf(await response.json().catch(() => null)) : null;
  if (!order) {
    return (
      <ConsultPage locale={locale} title={t("detailTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("loadError")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const self = `/${locale}/medical-orders/${encodeURIComponent(order.id)}`;
  const until = formatDate(locale, order.valid_until, { dateStyle: "medium" });
  const actionPath = (itemId: string, action: "order" | "defer") => `/api/medical-orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(itemId)}/${action}`;
  // The order carries catalogue ids only: the names come from the public catalogue reads (one per item); an unresolved item shows its group.
  const KIND = { labs: "lab", radiology: "radiology", nursing: "nursing" } as const;
  const found = await Promise.all(GROUPS.flatMap((g) => (order.groups[g]?.items ?? []).filter((i) => g !== "prescription").map(async (i) => [i.id, (await loadItem(KIND[i.group], i.catalog_id)).item] as const)));
  const names = new Map(found.map(([id, it]) => [id, it ? pickText(locale, it.nameAr, it.nameEn) : null]));
  const itemLabel = (item: MedicalOrderItem) => {
    const name = names.get(item.id) ?? t(`group${capital(item.group)}`);
    return item.sessions ? `${name} · ${t("sessionsLabel")}: ${item.sessions}` : name;
  };

  return (
    <ConsultPage locale={locale} title={t("detailTitle")} backHref={backHref}>
      <Hero icon="test-tube" tone={DIAG_TONES.lab} title={t("detailTitle")} sub={until ? `${t("expiresOn")} ${until}` : undefined}>
        {order.expires_soon ? <Notice warn>{t("expiresSoon")}</Notice> : null}
      </Hero>
      {order.expired ? <Notice warn>{t("expiredNote")}</Notice> : null}
      {query.error === "1" ? <Notice warn>{t("orderError")}</Notice> : null}
      {order.notes ? (
        <SectionCard id="medical-order-note" title={t("doctorNote")}>
          <p className={styles.itemText}>{order.notes}</p>
        </SectionCard>
      ) : null}
      <div className={styles.groups}>
        {GROUPS.map((group) => {
          const block = order.groups[group];
          if (!block) return null;
          const items = block.items ?? [];
          const open = items.filter((i) => i.status === "open");
          const label = t(`group${capital(group)}`);
          return (
            <SectionCard key={group} id={`medical-order-${group}`} title={label}>
              {items.length > 0 ? (
                <ul>
                  {items.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <span className={styles.itemText}>{itemLabel(item)}</span>
                      {item.status === "open" && !order.expired ? (
                        <OrderFormButton action={actionPath(item.id, "defer")} fields={{}} label={t("later")} next={self} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {group === "prescription" ? (
                order.expired ? (
                  <OrderFormButton action="" fields={{}} label={t("expiredDisabled")} next={self} disabled />
                ) : (
                  <ButtonLink href={groupFlowHref(locale, group, order)} label={t("orderPrescription")} variant="primary" fullWidth />
                )
              ) : open.length > 0 ? (
                <>
                  <OrderFormButton
                    action={actionPath(open[0].id, "order")}
                    fields={{ group_all: "1" }}
                    label={order.expired ? t("expiredDisabled") : t(`order${capital(group)}`)}
                    next={groupFlowHref(locale, group, order)}
                    primary
                    disabled={order.expired}
                  />
                  <p className={styles.itemText}>{t("selected", { a: open.length, b: items.length })}</p>
                </>
              ) : null}
            </SectionCard>
          );
        })}
      </div>
    </ConsultPage>
  );
}

function capital(group: OrderGroupKey): "Labs" | "Radiology" | "Nursing" | "Prescription" {
  return group === "labs" ? "Labs" : group === "radiology" ? "Radiology" : group === "nursing" ? "Nursing" : "Prescription";
}
