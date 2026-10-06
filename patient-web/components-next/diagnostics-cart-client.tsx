"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LAB } from "@/components-next/diagnostics/diag-parts";
import { formatPrice } from "@/lib/format-price";
import consult from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

export type DiagCartItem = { id: string; name: string; price?: number };

const KEY = "nabd-diagnostics-cart";

function readCart(): DiagCartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.id === "string") : [];
  } catch {
    return [];
  }
}

/** The diagnostics cart (canvas/Cart): the tests of this browser, the way to take the sample, the lab that can run all of them, and the way on to the checkout. The cart is local to this browser; the page only restyles it. */
export function DiagnosticsCartClient({ locale }: { locale: string }) {
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<DiagCartItem[]>([]);
  const [location, setLocation] = useState<"home" | "facility">("home");
  const [labId, setLabId] = useState("");
  const [labs, setLabs] = useState<Array<{ id: string; name: string }>>([]);
  const [labsLoaded, setLabsLoaded] = useState(false);

  useEffect(() => {
    const addId = searchParams.get("add");
    const addName = searchParams.get("name") || "";
    const addPrice = Number(searchParams.get("price") || NaN);
    let cart = readCart();
    if (addId && !cart.some((i) => i.id === addId)) {
      cart = [...cart, { id: addId, name: addName || addId, price: Number.isFinite(addPrice) ? addPrice : undefined }];
      try {
        localStorage.setItem(KEY, JSON.stringify(cart));
      } catch {}
      router.replace(`/${locale}/diagnostics/cart`);
    }
    setItems(cart);
  }, [searchParams, locale, router]);

  useEffect(() => {
    if (!items.length) {
      setLabs([]);
      setLabsLoaded(false);
      return;
    }
    setLabsLoaded(false);
    const ids = items.map((i) => encodeURIComponent(i.id)).join(",");
    fetch(`/api/diagnostics/compatible-labs?testIds=${ids}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
        const mapped = (Array.isArray(list) ? list : []).map((l: unknown) => {
          const r = l as Record<string, unknown>;
          const id = String(r.id ?? r._id ?? "");
          if (!id) return null;
          return { id, name: String(r.name_ar ?? r.name_en ?? r.name ?? id) };
        }).filter((l): l is { id: string; name: string } => l !== null);
        setLabs(mapped);
        if (mapped.length === 1) setLabId(mapped[0].id);
        setLabsLoaded(true);
      })
      .catch(() => {
        setLabs([]);
        setLabsLoaded(true);
      });
  }, [items]);

  function remove(id: string) {
    const cart = items.filter((i) => i.id !== id);
    setItems(cart);
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {}
  }

  function clear() {
    setItems([]);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const priced = items.filter((i) => i.price !== undefined);
  const total = items.reduce((s, i) => s + (i.price || 0), 0);

  if (!items.length) {
    return (
      <div className={rx.state}>
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("cartEmptyTitle")} body={t("cartEmptyBody")} actionLabel={t("browseTests")} actionHref={`/${locale}/diagnostics/labs`} />
      </div>
    );
  }

  const checkoutHref =
    `/${locale}/diagnostics/checkout?items=${encodeURIComponent(items.map((i) => i.id).join(","))}` +
    `&location=${location}${labId ? `&labId=${encodeURIComponent(labId)}` : ""}`;

  return (
    <>
      <section className={rx.card} aria-label={t("cartItems")}>
        <ul className={styles.cartLines}>
          {items.map((i) => (
            <li key={i.id}>
              <span className={styles.lineText}>
                <span className={consult.rowTitle}>{i.name}</span>
                {i.price !== undefined ? <span className={consult.rowSub}><bdi>{formatPrice(locale, i.price).text}</bdi></span> : null}
              </span>
              <button type="button" className={styles.removeBtn} onClick={() => remove(i.id)} aria-label={t("removeItem", { name: i.name })}>{t("remove")}</button>
            </li>
          ))}
        </ul>
      </section>

      <section className={rx.card} aria-label={t("cartTake")}>
        <fieldset className={consult.fieldset}>
          <legend className={consult.legend}>{t("cartTake")}</legend>
          <div className={consult.choices}>
            {(["home", "facility"] as const).map((loc) => (
              <button key={loc} type="button" className={consult.choice} aria-pressed={location === loc} onClick={() => setLocation(loc)}>
                {loc === "home" ? t("placeHomeLab") : t("placeLab")}
              </button>
            ))}
          </div>
        </fieldset>
        {labs.length > 0 ? (
          <label className={consult.field}>
            <span className={consult.label}>{t("cartLab")}</span>
            <select className={consult.control} value={labId} onChange={(e) => setLabId(e.target.value)}>
              <option value="">{t("cartChooseLab")}</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        ) : labsLoaded ? (
          <p className={consult.notice} role="status">{t("cartNoLabs")}</p>
        ) : (
          <p className={styles.flowNote} role="status">{t("cartLoadingLabs")}</p>
        )}
      </section>

      {priced.length > 0 ? (
        <section className={rx.card} aria-label={t("cartSummary")}>
          <div className={styles.totalLine}>
            <span>{t("cartTotal")}</span>
            <span><bdi>{formatPrice(locale, total).text}</bdi></span>
          </div>
          <p className={styles.flowNote}>{t("cartTotalNote")}</p>
        </section>
      ) : null}

      <div className={consult.actions}>
        {labId ? <ButtonLink href={checkoutHref} label={t("cartContinue")} /> : <Button label={t("cartContinue")} size="lg" disabled />}
        <Button label={t("cartClear")} variant="outline" size="lg" onClick={clear} />
      </div>
    </>
  );
}
