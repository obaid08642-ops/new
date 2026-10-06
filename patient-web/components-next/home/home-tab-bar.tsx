"use client";

import { useRouter } from "next/navigation";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { useRoutePrefetch } from "@/components-next/nav/use-route-prefetch";
import { BottomTabBar } from "@/components-next/ui-generated/components/Surfaces";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";

/**
 * The phone tab bar of HomeApp: the shared BottomTabBar, navigating to the section's page.
 *
 * `signedIn` is given by a page that knows it on the server (the dashboard). The public Home is static (F82-3) and
 * leaves it out: the session identity then decides, in the browser, whether the Home tab leads to the dashboard
 * (`signedInHomeHref`) or stays on the public home (`hrefs.home`).
 */
export function HomeTabBar({
  items,
  hrefs,
  value,
  label,
  signedIn,
  signedInHomeHref,
}: {
  items: BottomTabItem[];
  hrefs: Record<string, string>;
  value: string;
  label: string;
  signedIn?: boolean;
  signedInHomeHref?: string;
}) {
  const router = useRouter();
  const identity = useSessionIdentity({ enabled: signedIn === undefined });
  const isSignedIn = signedIn ?? identity.status === "authenticated";
  // Until the identity is known the prefetch stays on the signed-in side (the one that prefetches less).
  const prefetchAsSignedIn = signedIn ?? identity.status !== "anonymous";
  const targets = isSignedIn && signedInHomeHref ? { ...hrefs, home: signedInHomeHref } : hrefs;
  // The tabs are buttons that call router.push, which Next never prefetches: fetch their pages once the page is idle.
  useRoutePrefetch(Object.values(targets), { signedIn: prefetchAsSignedIn });
  return (
    <BottomTabBar
      label={label}
      items={items}
      value={value}
      onChange={(id) => {
        const href = targets[id];
        if (href && id !== value) router.push(href);
      }}
    />
  );
}
