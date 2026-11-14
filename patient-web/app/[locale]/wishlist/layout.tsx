import { RouteMessages } from "@/components-next/route-messages";
import type { Locale } from "@/lib/i18n";

// The client messages only this section reads (lib/i18n/client-messages.ts, ROUTE_GROUP_NAMESPACES): the wishlist rows' actions.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RouteMessages group="wishlist" locale={locale as Locale}>{children}</RouteMessages>;
}
