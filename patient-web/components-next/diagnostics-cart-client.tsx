"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

export function DiagnosticsCartClient({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<DiagCartItem[]>([]);
  const [location, setLocation] = useState<"home" | "facility">("home");
  const [labId, setLabId] = useState("");
  const [labs, setLabs] = useState<Array<{ id: string; name: string }>>([]);
  const ar = locale === "ar";

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
      return;
    }
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
      })
      .catch(() => setLabs([]));
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

  const total = items.reduce((s, i) => s + (i.price || 0), 0);

  if (!items.length) {
    return (
      <div>
        <p>{ar ? "السلة فارغة — أضف تحاليل قبل الحجز." : "Cart is empty — add tests before booking."}</p>
        <Link href={`/${locale}/diagnostics/labs`}>{ar ? "تصفح التحاليل" : "Browse tests"}</Link>
      </div>
    );
  }

  const checkoutHref =
    `/${locale}/diagnostics/checkout?items=${encodeURIComponent(items.map((i) => i.id).join(","))}` +
    `&location=${location}${labId ? `&labId=${encodeURIComponent(labId)}` : ""}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {items.map((i) => (
          <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{i.name}{i.price !== undefined ? ` — ${i.price}` : ""}</span>
            <button type="button" onClick={() => remove(i.id)}>{ar ? "إزالة" : "Remove"}</button>
          </li>
        ))}
      </ul>
      <p><strong>{ar ? "الإجمالي التقريبي:" : "Estimated total:"} {total}</strong></p>
      <div style={{ display: "flex", gap: 8 }}>
        {(["home", "facility"] as const).map((loc) => (
          <button key={loc} type="button" onClick={() => setLocation(loc)} style={{ fontWeight: location === loc ? 800 : 400 }}>
            {loc === "home" ? (ar ? "سحب منزلي" : "Home collection") : (ar ? "في المختبر" : "At lab")}
          </button>
        ))}
      </div>
      {labs.length > 0 ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{ar ? "المختبر" : "Lab"}</span>
          <select value={labId} onChange={(e) => setLabId(e.target.value)}>
            <option value="">{ar ? "اختر المختبر" : "Select lab"}</option>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
      ) : (
        <p>{ar ? "جارٍ تحميل المختبرات المتوافقة..." : "Loading compatible labs..."}</p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={clear}>{ar ? "إفراغ السلة" : "Clear cart"}</button>
        <Link href={checkoutHref}>{ar ? "متابعة للدفع والحجز" : "Continue to checkout"}</Link>
      </div>
    </div>
  );
}
