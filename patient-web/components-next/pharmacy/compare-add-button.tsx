"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { useCart } from "@/lib/context/CartContext";

/** "Add to cart" under a compared medicine (the app's compare screen): the line goes into the cart of this browser, no price. */
export function CompareAddButton({ id, name, rx, onlineOnly, image, slug }: { id: string; name: string; rx: boolean; onlineOnly: boolean; image?: string | null; slug?: string | null }) {
  const t = useTranslations("PharmacyBrowse");
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <Button
      size="sm"
      variant={added ? "primary" : "outline"}
      label={t("addToCart", { name })}
      onClick={() => {
        addItem({ id, name, rx, qty: 1, image: image ?? null, slug: slug ?? null, ...(onlineOnly ? { onlineOnly: true } : {}) });
        setAdded(true);
      }}
    />
  );
}
