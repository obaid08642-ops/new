"use client";

import { useRouter } from "next/navigation";
import { BottomTabBar } from "@/components-next/ui-generated/components/Surfaces";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";

/** The phone tab bar of HomeApp: the shared BottomTabBar, navigating to the section's page. */
export function HomeTabBar({
  items,
  hrefs,
  value,
  label,
}: {
  items: BottomTabItem[];
  hrefs: Record<string, string>;
  value: string;
  label: string;
}) {
  const router = useRouter();
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
