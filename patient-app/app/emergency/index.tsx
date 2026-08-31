// @ts-nocheck
import { Redirect } from "expo-router";
import { useLocalSearchParams as __useRouteParams } from "expo-router";
import CrisisContactsView from "../../src/components/views/CrisisContactsView";
function RInner() {
  return <Redirect href="/emergency/sos" />;
}

// __RouteGuard: Phase 2.7 emergency hub (view=crisis)
export default function RInnerRoute() {
  const __p = __useRouteParams() as any;
  if (__p?.view === "crisis") return <CrisisContactsView />;
  return <RInner />;
}
