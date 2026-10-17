import { RouteMessages } from "@/components-next/route-messages";
import type { Locale } from "@/lib/i18n";

// F82 (issue 427): the client messages only this section reads (lib/i18n/client-messages.ts, ROUTE_GROUP_NAMESPACES).
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RouteMessages group="insurance" locale={locale as Locale}>{children}</RouteMessages>;
}
