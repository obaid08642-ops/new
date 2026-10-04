"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { installNetworkPolicy } from "@/lib/api/net/install";
import { subscribeOnline } from "@/lib/api/net/online";
import { outbox } from "@/lib/api/net/outbox";
import { showToast } from "@/lib/api/net/toast";

/**
 * P15.1 — installs the one network client over `globalThis.fetch`.
 * P15.4 — drains the outbox when the browser reports it is back online.
 *
 * Mounted once, as high in the tree as possible, so every `fetch(...)` in every
 * screen inherits the deadline / retry / abort / offline policy without those
 * 170 call sites having to change. See `lib/api/net/install.ts` for why this is
 * the consolidation chosen, and `P15_NOTES.md` for the trade-off stated plainly.
 */
export function NetworkPolicy({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("Network");

  useEffect(() => {
    installNetworkPolicy();
  }, []);

  useEffect(
    () =>
      subscribeOnline((online) => {
        if (!online || outbox.size() === 0) return;
        void outbox
          .replay((action) =>
            fetch(action.url, { method: action.method, headers: action.headers, body: action.body }),
          )
          .then((result) => {
            if (result.failedId === null && result.sent.length > 0) {
              showToast({ kind: "success", title: t("queuedTitle"), message: t("replayed") });
            } else if (result.failedId !== null) {
              showToast({ kind: "error", title: t("rollback.title"), message: t("outboxFailed") });
            }
          });
      }),
    [t],
  );

  return <>{children}</>;
}
