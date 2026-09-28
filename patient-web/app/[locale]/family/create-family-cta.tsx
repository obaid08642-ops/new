"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** F70: create-family CTA shown when the patient has no family group (404). */
export function CreateFamilyCta({ locale, label, doneLabel }: { locale: string; label: string; doneLabel: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/family/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={() => void create()} disabled={busy} className="button button-primary" type="button">
      {busy ? doneLabel : label}
    </button>
  );
}
