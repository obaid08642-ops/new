import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { reorderLines } from "@/lib/pharmacy/order-view";
import { ReorderPicker } from "./reorder-picker";
import { readOrderDetail } from "./read-orders";
import rx from "@/components-next/pharmacy/rx.module.css";

/** `/pharmacy/reorder`: the lines of an earlier order, chosen and put into the cart of this browser. */
export async function ReorderScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "OrderReorder" });
  const orders = await getTranslations({ locale, namespace: "Orders" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const orderHref = `/${locale}/orders/${encodeURIComponent(orderId)}`;
  const frame = (children: React.ReactNode) => (
    <CoreShell locale={locale} title={t("title")} backHref={orderHref} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {children}
      </div>
    </CoreShell>
  );

  const order = await readOrderDetail(locale, orderId, token);
  if (!order.ok) {
    return frame(<div className={rx.state}><RetryLinkErrorState title={orders("unavailableTitle")} body={orders("unavailableBody")} retryLabel={routeState("retry")} actionLabel={orders("backToOrders")} actionHref={`/${locale}/orders`} /></div>);
  }
  const { addable, skipped } = reorderLines(order.detail);
  return frame(
    <ReorderPicker locale={locale} orderId={orderId} lines={addable} skipped={skipped} needsPrescription={Boolean(order.detail.prescriptionId)} />,
  );
}
