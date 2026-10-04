"use client";

import { useEffect } from "react";
import { installNetworkPolicy } from "@/lib/api/net/install";

/**
 * P15.1 — installs the one network client over `globalThis.fetch`.
 *
 * Mounted once, as high in the tree as possible, so every `fetch(...)` in every
 * screen inherits the deadline / retry / abort / offline policy without those
 * 170 call sites having to change. See `lib/api/net/install.ts` for why this is
 * the consolidation chosen, and `P15_NOTES.md` for the trade-off stated plainly.
 */
export function NetworkPolicy({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    installNetworkPolicy();
  }, []);
  return <>{children}</>;
}
