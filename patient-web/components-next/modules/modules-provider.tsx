"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NONE_DISABLED, isPathHidden, type DisabledModules, type ModuleKey } from "@/lib/modules";

/**
 * Module switches (#953) for client components: the locale layout reads GET /modules on the server (fail-open) and hands
 * the switched-off keys down here, so a client component such as CoreShell can hide a section without its own request.
 */
const ModulesContext = createContext<DisabledModules>(NONE_DISABLED);

export function ModulesProvider({ disabled, children }: { disabled: readonly ModuleKey[]; children: ReactNode }) {
  const set = useMemo<DisabledModules>(() => (disabled.length ? new Set(disabled) : NONE_DISABLED), [disabled]);
  return <ModulesContext.Provider value={set}>{children}</ModulesContext.Provider>;
}

export const useDisabledModules = (): DisabledModules => useContext(ModulesContext);

/**
 * A deep link into a switched-off module shows a calm "service unavailable" state instead of the page. The state is built by the
 * server layout (ModuleBlocked, which also translates the words) and passed in as `blocked`, so this client file does not import it.
 */
export function ModuleRouteGate({ blocked, children }: { blocked: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const disabled = useDisabledModules();
  if (!isPathHidden(pathname, disabled)) return <>{children}</>;
  return <>{blocked}</>;
}
