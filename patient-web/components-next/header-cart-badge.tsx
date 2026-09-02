"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/lib/context/CartContext";
import { ShoppingCart } from "lucide-react";
import styles from "./header-cart-badge.module.css";

export function HeaderCartBadge({ locale }: { locale: string }) {
  const { itemCount } = useCart();

  return (
    <Link
      href={`/${locale}/cart`}
      className={styles.cartBtn}
      aria-label="Shopping Cart"
    >
      <ShoppingCart size={20} />
      {itemCount > 0 && <span className={styles.badge}>{itemCount}</span>}
    </Link>
  );
}
