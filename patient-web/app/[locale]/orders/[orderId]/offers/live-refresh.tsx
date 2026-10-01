"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { useRouter } from "next/navigation";

export function PharmacyOffersLiveRefresh({ active, label, refreshLabel }: { active: boolean; label: string; refreshLabel: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(15);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) { router.refresh(); return 15; }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  if (!active) return null;
  return <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
    <Icon name="refresh-cw" size={16} />
    <span>{label} {seconds}s</span>
    <button type="button" onClick={() => { setSeconds(15); router.refresh(); }}>{refreshLabel}</button>
  </div>;
}
