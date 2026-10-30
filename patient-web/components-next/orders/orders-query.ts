import type { OrderKind } from "./center-rows";

/** The two tabs of the orders list. */
export type OrdersTab = "current" | "results" | "previous";
type Tab = OrdersTab;

// Kept out of order-list.tsx ("use client"): orders-screen.tsx is a server component and cannot call a function exported from a client module.
/** The order of the service chips (the app's filterKind order); only the services that have a row are drawn. */
export const KIND_ORDER: readonly OrderKind[] = ["pharmacy", "consultation", "labs", "radiology", "nursing", "returns"];

/** The list's own address for a tab and a service: defaults (current, all) are left out. */
export function ordersQuery(path: string, tab: Tab, kind: OrderKind | null): string {
  const params = new URLSearchParams();
  if (tab !== "current") params.set("tab", tab);
  if (kind) params.set("kind", kind);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Reads ?tab and ?kind from the address; anything unknown is ignored. */
export function parseOrdersQuery(query: { tab?: string | string[]; kind?: string | string[] }): { tab?: Tab; kind: OrderKind | null } {
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const kind = KIND_ORDER.find((value) => value === one(query.kind)) ?? null;
  const tab = one(query.tab);
  return { tab: tab === "previous" || tab === "results" || tab === "current" ? tab : undefined, kind };
}

