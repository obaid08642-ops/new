import { Toast } from "@/components-next/ui-generated/components/Feedback";

/**
 * The banner itself, without the browser: what it shows for a given state (tests render this). It is its own module so the locale
 * layout does not carry the Toast (and with it Button, FIcon and every icon outline) in the first-load JS of every page: the banner
 * loads this file only once the browser is offline (offline-banner.tsx).
 */
export function OfflineBannerView({ online, message }: { online: boolean; message: string }) {
  if (online) return null;
  return <Toast message={message} tone="warning" testID="offline-banner" />;
}
