"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components-next/consult/consult.module.css";
import { Button } from "@/components-next/ui-generated/components/Button";

/** Starts a consultation booking on behalf of this family member (the app's "Book a consultation" on the member page). */
export function BookForMemberButton({ memberRef, label, errorLabel, href }: { memberRef: string; label: string; errorLabel: string; href: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function go() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/family/booking-for", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref: memberRef }) });
      if (!res.ok) throw new Error("failed");
      router.push(href);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <>
      <Button fullWidth size="lg" label={label} loading={busy} onClick={() => void go()} />
      {failed ? <p className={styles.error} role="alert">{errorLabel}</p> : null}
    </>
  );
}
