"use client";

import { useEffect } from "react";
import { sendThreadReceipts } from "@/lib/chat/receipts";

/** Renders nothing: while the thread is open and visible, the delivered and seen receipts go to the backend. */
export function ReceiptSync({ threadId, upToMessageId }: { threadId: string; upToMessageId: string | null }) {
  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") void sendThreadReceipts(threadId, upToMessageId); };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [threadId, upToMessageId]);
  return null;
}
