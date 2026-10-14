"use client";

import { useRouter } from "next/navigation";
import { useRoutePrefetch } from "@/components-next/nav/use-route-prefetch";
import { BottomTabBar } from "@/components-next/ui-generated/components/Surfaces";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";

/** The phone tab bar of HomeApp: the shared BottomTabBar, navigating to the section's page. */
export function HomeTabBar({
  items,
  hrefs,
  value,
  label,
  signedIn = false,
}: {
  items: BottomTabItem[];
  hrefs: Record<string, string>;
  value: string;
  label: string;
  signedIn?: boolean;
}) {
  const router = useRouter();
  // The tabs are buttons that call router.push, which Next never prefetches: fetch their pages once the page is idle.
  useRoutePrefetch(Object.values(hrefs), { signedIn });
  return (
    <BottomTabBar
      label={label}
      items={items}
      value={value}
      onChange={(id) => {
        const href = hrefs[id];
        if (href && id !== value) router.push(href);
      }}
    />
  );
}
