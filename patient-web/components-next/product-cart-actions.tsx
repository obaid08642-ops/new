"use client";

import React, { useState } from "react";
import { useCart } from "@/lib/context/CartContext";
import { Check, Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import styles from "./product-cart-actions.module.css";

type Props = {
  locale: string;
  product: {
    id: string;
    name: string;
    price: number;
    rx: boolean;
    image?: string | null;
    slug: string;
    activeIngredient?: string | null;
    form?: string | null;
    strength?: string | null;
  };
};

export function ProductCartActions({ locale, product }: Props) {
  const { items, addItem, updateQty } = useCart();
  const currentItem = items.find((i) => i.id === product.id);
  const qty = currentItem?.qty || 0;
  const [addedEffect, setAddedEffect] = useState(false);

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      rx: product.rx,
      image: product.image,
      slug: product.slug,
      activeIngredient: product.activeIngredient,
      form: product.form,
      strength: product.strength,
      qty: 1,
    });
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 1500);
  };

  const isAr = locale === "ar";

  return (
    <div className={styles.container}>
      {qty > 0 ? (
        <div className={styles.qtyRow}>
          <div className={styles.counter}>
            <button
              type="button"
              className={styles.counterBtn}
              onClick={() => updateQty(product.id, -1)}
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className={styles.qtyText}>{qty}</span>
            <button
              type="button"
              className={styles.counterBtn}
              onClick={() => updateQty(product.id, 1)}
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <Link href={`/${locale}/cart`} className={styles.viewCartBtn}>
            <ShoppingBag size={18} />
            <span>{isAr ? "عرض السلة وإتمام الطلب" : "View Cart & Checkout"}</span>
          </Link>
        </div>
      ) : (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.addBtn} ${addedEffect ? styles.added : ""}`}
            onClick={handleAdd}
          >
            {addedEffect ? (
              <>
                <Check size={20} />
                <span>{isAr ? "تمت الإضافة للسلة" : "Added to Cart"}</span>
              </>
            ) : (
              <>
                <ShoppingCart size={20} />
                <span>{isAr ? "إضافة إلى السلة" : "Add to Cart"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
