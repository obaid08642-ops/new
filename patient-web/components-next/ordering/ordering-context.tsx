import { getTranslations } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractFamilyMembers } from "@/lib/api/family";
import { contextQuery, pointFromAddresses, type Point } from "@/lib/ordering/context";
import type { OrderMode, Payer, ServiceKind } from "@/lib/ordering/quote";
import { OrderContextBar } from "./order-context-bar";
import { defaultAddressLine, insuranceClass } from "./order-context";

/**
 * The context bar of an ordering page (Ord01) with the profile read it needs: the default address (and its point for the quote) and the
 * saved insurance class. Returns the bar and the point so the page can hand the point to its client part.
 */
export async function loadOrderingContext(args: { locale: string; token: string; path: string; kind: ServiceKind; place: OrderMode; pay: Payer; item?: string; who?: string }): Promise<{ bar: React.ReactNode; point: Point | null }> {
  const { locale, token, path, kind, place, pay, item, who } = args;
  const d = await getTranslations("DiagWeb");
  const oc = await getTranslations("OrderContext");
  const t = await getTranslations("OrderingFlow");
  const [addressesResponse, insuranceResponse, familyResponse] = await Promise.all([
    callPatientApi("/users/me/addresses", { cache: "no-store" }, token).catch(() => null),
    callPatientApi("/users/me/insurance", { cache: "no-store" }, token).catch(() => null),
    callPatientApi("/family/members", { cache: "no-store" }, token).catch(() => null),
  ]);
  const addresses = addressesResponse?.ok ? await addressesResponse.json().catch(() => null) : null;
  const insurance = insuranceResponse?.ok ? insuranceClass(await insuranceResponse.json().catch(() => null)) : { hasPolicy: false, cls: null };
  // the family members the patient can order for (the account holder is "Me": no id is sent for them); none read, none offered
  const members = (familyResponse?.ok ? extractFamilyMembers(await familyResponse.json().catch(() => null)) : []).filter((m) => m.role !== "owner");
  const href = (over: Partial<{ place: OrderMode; pay: Payer; who: string | undefined }>) => `/${locale}${path}${contextQuery({ kind, place, pay, item, who, ...over })}`;
  const bar = (
    <OrderContextBar
      label={t("ctxAria")}
      placeLabel={d("placeLabel")}
      place={place}
      placeOptions={[{ value: "home", label: t("optHome"), href: href({ place: "home" }) }, { value: "facility", label: t("optGo"), href: href({ place: "facility" }) }]}
      payLabel={d("payLabel")}
      pay={pay === "insurance" ? "insurance" : "self_pay"}
      payOptions={[{ value: "self_pay", label: d("paySelf"), href: href({ pay: "cash" }) }, { value: "insurance", label: d("payInsurance"), href: href({ pay: "insurance" }) }]}
      address={defaultAddressLine(addresses)}
      insurance={insurance}
      addressHref={`/${locale}/profile/addresses`}
      insuranceHref={`/${locale}/profile`}
      who={{
        label: oc("forLabel"),
        current: who ?? "me",
        options: [{ value: "me", label: oc("forMe"), href: href({ who: undefined }) }, ...members.map((m) => ({ value: m.id, label: m.displayName ?? m.relation ?? oc("forLabel"), href: href({ who: m.id }) }))],
      }}
      copy={{ hint: oc("hint"), addAddress: oc("addAddress"), addInsurance: oc("addInsurance"), insuranceSub: oc("insuranceSub"), insuranceName: d("payInsurance") }}
    />
  );
  return { bar, point: pointFromAddresses(addresses) };
}
