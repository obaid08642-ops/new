"use client";

import React, { useState } from "react";
import { useCart } from "@/lib/context/CartContext";
import { ShoppingBag, Check, Plus, Minus } from "lucide-react";

interface QuickAddCartBtnProps {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    form?: string | null;
    strength?: string | null;
    slug?: string | null;
    rx?: boolean;
  };
  labels?: {
    add?: string;
    added?: string;
  };
}

export function QuickAddCartBtn({ item, labels }: QuickAddCartBtnProps) {
  const { items, addItem, updateQty } = useCart();
  const existing = items.find((i) => i.id === item.id || (item.slug && i.slug === item.slug));
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image ?? undefined,
      form: item.form,
      strength: item.strength,
      slug: item.slug,
      rx: item.rx || false,
      qty: 1,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (existing) {
      updateQty(existing.id, -1);
    }
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (existing) {
      updateQty(existing.id, 1);
    }
  };

  if (existing && existing.qty > 0) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "#16213A",
          borderRadius: "12px",
          padding: "4px 8px",
          color: "#FFFFFF",
          fontSize: "13px",
          fontWeight: 700,
          marginTop: "6px",
          boxShadow: "0 4px 12px rgba(22, 33, 58, 0.15)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={handleMinus}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#FFFFFF",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>
        <span style={{ minWidth: "20px", textAlign: "center", color: "#B8E030" }}>
          {existing.qty}
        </span>
        <button
          type="button"
          onClick={handlePlus}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#FFFFFF",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
          aria-label="Increase quantity"
        >
          <Plus size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "100%",
        minHeight: "34px",
        background: justAdded ? "#5FD9B3" : "#B8E030",
        color: "#16213A",
        border: "none",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: 800,
        cursor: "pointer",
        marginTop: "6px",
        boxShadow: "0 4px 14px rgba(184, 224, 48, 0.25)",
        transition: "all 0.15s ease",
      }}
      aria-label="Add to cart"
    >
      {justAdded ? (
        <>
          <Check size={15} />
          <span>{labels?.added || "تمت الإضافة"}</span>
        </>
      ) : (
        <>
          <ShoppingBag size={14} />
          <span>{labels?.add || "أضف للسلة"}</span>
        </>
      )}
    </button>
  );
}
