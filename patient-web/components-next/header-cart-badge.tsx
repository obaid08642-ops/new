"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/context/CartContext";
import { ShoppingCart } from "lucide-react";
import styles from "./header-cart-badge.module.css";

export function HeaderCartBadge({ locale }: { locale: string }) {
  const { itemCount } = useCart();
  const t = useTranslations("CoreShell");

  return (
    <Link
      href={`/${locale}/cart`}
      className={styles.cartBtn}
      aria-label={t("cart")}
    >
      <ShoppingCart size={20} />
      {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
    </Link>
  );
}
