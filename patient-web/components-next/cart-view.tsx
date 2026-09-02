"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/lib/context/CartContext";
import { ArrowLeft, ArrowRight, Minus, Plus, Pill, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import styles from "./cart-view.module.css";

type Props = {
  locale: string;
  labels: {
    title: string;
    empty: string;
    subtotal: string;
    total: string;
    checkout: string;
    browseCatalog: string;
    currency: string;
    prescriptionNotice: string;
  };
};

export function CartView({ locale, labels }: Props) {
  const { items, updateQty, removeItem, subtotal, hasRxItems } = useCart();
  const isAr = locale === "ar";
  const Direction = isAr ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.emptyIcon}>
          <ShoppingBag size={48} />
        </div>
        <h2>{labels.empty}</h2>
        <p>{isAr ? "سلتك فارغة حالياً. تصفح كتالوج الأدوية والصيدلية وأضف ما تحتاجه." : "Your cart is currently empty. Browse our medicines catalog to add items."}</p>
        <Link href={`/${locale}/c`} className={styles.browseBtn}>
          <span>{labels.browseCatalog}</span>
          <Direction size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.cartGrid}>
      <div className={styles.itemsList}>
        {hasRxItems && (
          <div className={styles.rxWarning}>
            <ShieldCheck size={20} color="#b45309" />
            <p>{labels.prescriptionNotice}</p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemMedia}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className={styles.itemImg} />
              ) : (
                <div className={styles.itemPlaceholder}>
                  <Pill size={24} />
                </div>
              )}
            </div>

            <div className={styles.itemInfo}>
              <Link href={`/${locale}/p/${encodeURIComponent(item.slug || item.id)}`} className={styles.itemName}>
                {item.name}
              </Link>
              {[item.form, item.strength].filter(Boolean).length > 0 && (
                <span className={styles.itemMeta}>
                  {[item.form, item.strength].filter(Boolean).join(" · ")}
                </span>
              )}
              {item.rx && (
                <span className={styles.rxBadge}>
                  {isAr ? "يتطلب وصفة" : "Prescription Required"}
                </span>
              )}
              <strong className={styles.itemPrice}>
                {(item.price * item.qty).toFixed(2)} {labels.currency}
              </strong>
            </div>

            <div className={styles.itemControls}>
              <div className={styles.counter}>
                <button
                  type="button"
                  className={styles.counterBtn}
                  onClick={() => updateQty(item.id, -1)}
                  aria-label="Decrease"
                >
                  <Minus size={14} />
                </button>
                <span className={styles.counterNum}>{item.qty}</span>
                <button
                  type="button"
                  className={styles.counterBtn}
                  onClick={() => updateQty(item.id, 1)}
                  aria-label="Increase"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeItem(item.id)}
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.summaryCard}>
        <h3>{isAr ? "ملخص الطلب" : "Order Summary"}</h3>
        <div className={styles.summaryRow}>
          <span>{labels.subtotal}</span>
          <strong>
            {subtotal.toFixed(2)} {labels.currency}
          </strong>
        </div>
        <div className={styles.summaryRow}>
          <span>{isAr ? "رسوم التوصيل" : "Delivery Fee"}</span>
          <span className={styles.freeBadge}>{isAr ? "مجاناً" : "Free"}</span>
        </div>
        <hr className={styles.divider} />
        <div className={styles.totalRow}>
          <span>{labels.total}</span>
          <strong>
            {subtotal.toFixed(2)} {labels.currency}
          </strong>
        </div>

        <Link href={`/${locale}/cart/checkout`} className={styles.checkoutBtn}>
          <span>{labels.checkout}</span>
          <Direction size={18} />
        </Link>
      </div>
    </div>
  );
}
