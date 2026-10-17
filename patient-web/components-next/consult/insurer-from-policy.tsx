"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./consult.module.css";

/**
 * Decision 30 on the doctors list: "Insurance" with no insurer in the URL. The page is a cached public page and reads no
 * session, so the browser asks for the saved policy (GET /api/insurance/policy, no-store) and, when there is one, opens
 * the same list for that company and class (`insurance`, `insurance_class`). A guest, or a patient with no policy yet,
 * keeps the doctors who accept insurance and sees the link to add a policy.
 */
export function InsurerFromPolicy({ pageHref, noPolicyText, addPolicyHref, addPolicyText }: { pageHref: string; noPolicyText: string; addPolicyHref: string; addPolicyText: string }) {
  const router = useRouter();
  const [noPolicy, setNoPolicy] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/insurance/policy", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((insurer: { company?: unknown; class?: unknown } | null) => {
        if (!live) return;
        if (insurer && typeof insurer.company === "string" && insurer.company) {
          const [path, query = ""] = pageHref.split("?");
          const params = new URLSearchParams(query);
          params.set("insurance", insurer.company);
          if (typeof insurer.class === "string" && insurer.class) params.set("insurance_class", insurer.class);
          router.replace(`${path}?${params.toString()}`);
        } else setNoPolicy(true);
      });
    return () => { live = false; };
  }, [pageHref, router]);
  if (!noPolicy) return null;
  return (
    <div className={styles.activeFilter}>
      <span>{noPolicyText}</span>
      <Link className={styles.activeFilterClear} href={addPolicyHref}>{addPolicyText}</Link>
    </div>
  );
}
