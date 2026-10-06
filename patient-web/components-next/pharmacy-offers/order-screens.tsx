import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { parseOrderId } from "@/lib/api/orders";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { extractPatientPharmacyThreadDetail, extractPatientPharmacyThreads } from "@/lib/api/pharmacy-negotiation";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { getDirection, type Locale } from "@/lib/i18n";
import { formatMoney, pickName } from "./format";
import { LocalTime } from "./local-time";
import { NegotiationActions } from "./negotiation-actions";
import { QuoteSection } from "./quote-section";
import { statusKey } from "./status";
import { WaitingActions } from "./waiting-actions";
import { OFFER_TONES } from "./tones";
import styles from "./offers.module.css";

const UUID = /^[0-9a-f-]{36}$/i;
/** An order in one of these statuses can no longer be cancelled. */
const NOT_CANCELLABLE = new Set(["cancelled", "delivered", "completed"]);

/** Server reads shared by the screens: a signed-out patient goes to sign-in, someone else's or a missing order is a 404. */
async function readOrder(locale: Locale, orderId: string, token: string) {
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if ([403, 404].includes(response.status)) notFound();
  return response;
}

/** `/pharmacy/final-quote`: the selected offer's final price, accept it, register cash on delivery. */
export async function FinalQuoteScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const response = await readOrder(locale, orderId, token);
  const orderHref = `/${locale}/orders/${orderId}`;
  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("quoteTitle")} backHref={orderHref} width="narrow">
        <div className={styles.state}><RetryErrorState title={t("loadErrorTitle")} body={t("loadErrorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const progress = extractPatientPharmacyOrderProgress(await response.json().catch(() => null)) ?? {};
  return (
    <CoreShell locale={locale} title={t("quoteTitle")} backHref={orderHref} width="narrow">
      <div className={styles.page}>
        <div className={styles.head}><h1 className={styles.title}>{t("quoteTitle")}</h1></div>
        <Link className={styles.backLink} href={orderHref}>{t("backToOrder")}</Link>
        <QuoteSection locale={locale} orderId={orderId} progress={progress} screen="final" />
      </div>
    </CoreShell>
  );
}

/** `/pharmacy/waiting-for-pharmacy`: where the order stands while pharmacies reply; manual refresh and a confirmed cancel. */
export async function WaitingScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!parseOrderId(orderId).success) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const [response, offersResponse] = await Promise.all([readOrder(locale, orderId, token), callPatientApi(`/patient/pharmacy/orders/${orderId}/offers`, {}, token)]);
  const orderHref = `/${locale}/orders/${orderId}`;
  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("waitingTitle")} backHref={orderHref} width="narrow">
        <div className={styles.state}><RetryErrorState title={t("loadErrorTitle")} body={t("loadErrorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const progress = extractPatientPharmacyOrderProgress(await response.json().catch(() => null)) ?? {};
  const offers = offersResponse.ok ? extractPatientPharmacyOffers(await offersResponse.json().catch(() => null)) : [];
  const status = (progress.status ?? "").toLowerCase();
  // Offers have arrived and nothing is selected yet: that is what the "offers ready" state of the order means for the patient.
  if (offers.length > 0 && !progress.governedState && !NOT_CANCELLABLE.has(status)) redirect(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderId)}`);
  return (
    <CoreShell locale={locale} title={t("waitingTitle")} backHref={orderHref} width="narrow">
      <div className={styles.page}>
        <div className={styles.head}><h1 className={styles.title}>{t("waitingTitle")}</h1></div>
        <Link className={styles.backLink} href={orderHref}>{t("backToOrder")}</Link>
        <div className={styles.hero}>
          <div className={styles.pulse}>
            {status === "broadcasting" || status === "awaiting_full_acceptance" ? (<><span className={styles.ring} aria-hidden="true" /><span className={styles.ring} aria-hidden="true" /></>) : null}
            <FIcon icon="storefront" tone={OFFER_TONES.pharmacy} size={56} chip="solid" />
          </div>
          <div className={styles.heroText}>
            <h2 className={styles.heroTitle}>{t("heroTitleWaiting")}</h2>
            <p className={styles.heroSub}>{status === "draft" ? t("waitingDraft") : t("waitingLead")}</p>
            {progress.status ? <div className={styles.chips}><StatusChip label={t(`status.${statusKey(progress.status)}`)} tone={OFFER_TONES.pharmacy} /></div> : null}
          </div>
        </div>
        <p className={styles.lead}>{t("waitingManual")}</p>
        <WaitingActions orderId={orderId} canCancel={Boolean(progress.status) && !NOT_CANCELLABLE.has(status)} />
      </div>
    </CoreShell>
  );
}

/** `/orders/:id/offers/negotiation`: the order's conversations with pharmacies about substitutes. */
export async function NegotiationListScreen({ locale, orderId }: { locale: Locale; orderId: string }) {
  if (!UUID.test(orderId)) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const [threadsResponse, orderResponse] = await Promise.all([
    callPatientApi(`/pharmacy/chat/threads?order_id=${encodeURIComponent(orderId)}`, {}, token),
    callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token),
  ]);
  if (threadsResponse.status === 401 || orderResponse.status === 401) redirect(`/${locale}/login`);
  if ([403, 404].includes(threadsResponse.status) || [403, 404].includes(orderResponse.status)) notFound();
  const back = `/${locale}/orders/${orderId}/offers`;
  if (!threadsResponse.ok) {
    return (
      <CoreShell locale={locale} title={t("negotiationTitle")} backHref={back} width="narrow">
        <div className={styles.state}><RetryErrorState title={t("threadsErrorTitle")} body={t("loadErrorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const threads = extractPatientPharmacyThreads(await threadsResponse.json().catch(() => null));
  const progress = orderResponse.ok ? extractPatientPharmacyOrderProgress(await orderResponse.json().catch(() => null)) : null;
  const names = new Map((progress?.items ?? []).map((item) => [item.id, pickName(locale, { ar: item.nameAr, en: item.nameEn, raw: item.rawName })]));
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  return (
    <CoreShell locale={locale} title={t("negotiationTitle")} backHref={back} width="narrow">
      <div className={styles.page}>
        <div className={styles.head}><h1 className={styles.title}>{t("negotiationTitle")}</h1></div>
        <Link className={styles.backLink} href={back}>{t("backToOffers")}</Link>
        <p className={styles.lead}>{t("negotiationLead")}</p>
        {threads.length ? (
          <ul className={styles.rows} aria-label={t("negotiationTitle")}>
            {threads.map((thread) => {
              const item = thread.orderItemId ? names.get(thread.orderItemId) : undefined;
              const status = thread.status === "open" || thread.status === "closed" || thread.status === "archived" ? thread.status : null;
              const resolution = thread.resolution === "accepted" || thread.resolution === "rejected" || thread.resolution === "removed" || thread.resolution === "timeout" ? thread.resolution : null;
              return (
                <li key={thread.id}>
                  <Link className={`${styles.row} ${styles.rowLink}`} href={`/${locale}/orders/${orderId}/offers/negotiation/${thread.id}`} aria-label={`${t("openConversation")}${item ? `: ${item}` : ""}`}>
                    <FIcon icon="chat-circle-text" tone={OFFER_TONES.pharmacy} size={48} />
                    <span className={styles.rowBody}>
                      <span className={styles.rowName}>{item ? t("conversationFor", { name: item }) : t("threadTitle")}</span>
                      <span className={styles.chips}>
                        {status ? <StatusChip label={t(`thread.${status}`)} tone={status === "open" ? OFFER_TONES.good : OFFER_TONES.info} /> : null}
                        {resolution ? <StatusChip label={t(`resolution.${resolution}`)} tone={OFFER_TONES.info} /> : null}
                      </span>
                    </span>
                    <span className={styles.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.state}><EmptyState icon="chat-circle-text" tone={OFFER_TONES.pharmacy} title={t("noThreadsTitle")} body={t("noThreadsBody")} /></div>
        )}
      </div>
    </CoreShell>
  );
}

/** `/orders/:id/offers/negotiation/:threadId`: one conversation. Messages are the other party's text: drawn as text, never as markup. */
export async function NegotiationThreadScreen({ locale, orderId, threadId }: { locale: Locale; orderId: string; threadId: string }) {
  if (!UUID.test(orderId) || !UUID.test(threadId)) notFound();
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const [response, orderResponse] = await Promise.all([
    callPatientApi(`/pharmacy/chat/threads/${threadId}/messages`, {}, token),
    callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token),
  ]);
  if (response.status === 401 || orderResponse.status === 401) redirect(`/${locale}/login`);
  if ([403, 404].includes(response.status) || [403, 404].includes(orderResponse.status)) notFound();
  const back = `/${locale}/orders/${orderId}/offers/negotiation`;
  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("threadTitle")} backHref={back} width="narrow">
        <div className={styles.state}><RetryErrorState title={t("messagesErrorTitle")} body={t("loadErrorBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const { thread, messages } = extractPatientPharmacyThreadDetail(await response.json().catch(() => null));
  // A conversation belongs to one order: the id in the address has to be that order.
  if (thread?.orderId && thread.orderId !== orderId) notFound();
  const progress = orderResponse.ok ? extractPatientPharmacyOrderProgress(await orderResponse.json().catch(() => null)) : null;
  const item = thread?.orderItemId ? (progress?.items ?? []).find((candidate) => candidate.id === thread.orderItemId) : undefined;
  const itemName = item ? pickName(locale, { ar: item.nameAr, en: item.nameEn, raw: item.rawName }) : undefined;
  const open = thread?.status === "open";
  const substituteMessageIds = open ? messages.filter((message) => message.substitute).map((message) => message.id) : [];
  const resolution = thread?.resolution === "accepted" || thread?.resolution === "rejected" || thread?.resolution === "removed" || thread?.resolution === "timeout" ? thread.resolution : null;
  return (
    <CoreShell locale={locale} title={t("threadTitle")} backHref={back} width="narrow">
      <div className={styles.page}>
        <div className={styles.head}><h1 className={styles.title}>{t("threadTitle")}</h1></div>
        <Link className={styles.backLink} href={back}>{t("backToConversations")}</Link>
        {itemName ? <p className={styles.lead}>{t("conversationFor", { name: itemName })}</p> : null}
        <p className={styles.lead}>{t("negotiationLead")}</p>
        {resolution ? <div className={styles.chips}><StatusChip label={t(`resolution.${resolution}`)} tone={OFFER_TONES.info} /></div> : null}
        {messages.length ? (
          <ul className={styles.messages} aria-label={t("threadTitle")}>
            {messages.map((message) => {
              const role = message.senderRole === "patient" || message.senderRole === "pharmacy" || message.senderRole === "system" ? message.senderRole : null;
                            return (
                <li key={message.id} className={`${styles.message} ${role === "patient" ? styles.mine : role === "system" ? styles.system : styles.theirs}`}>
                  {role ? <span className={styles.sender}>{t(`sender.${role}`)}</span> : null}
                  {message.text ? <p className={styles.body} dir="auto">{message.text}</p> : null}
                  {message.substitute ? (
                    <div className={styles.substitute}>
                      <span className={styles.substituteTitle}>{t("suggestedSubstitute")}</span>
                      <span dir="auto">{message.substitute.name ?? message.substitute.sku}</span>
                      {message.substitute.price !== undefined ? <span>{t("substitutePrice", { price: formatMoney(locale, message.substitute.price) })}</span> : null}
                      {message.substitute.notes ? <span dir="auto">{message.substitute.notes}</span> : null}
                    </div>
                  ) : null}
                  {message.createdAt ? <LocalTime iso={message.createdAt} locale={locale} className={styles.when} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.lead}>{t("noMessages")}</p>
        )}
        {thread ? <NegotiationActions threadId={threadId} substituteMessageIds={substituteMessageIds} open={open} /> : null}
      </div>
    </CoreShell>
  );
}
