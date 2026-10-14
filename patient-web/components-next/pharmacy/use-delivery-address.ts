"use client";

import { useEffect, useState } from "react";
import { loadDeliveryAddresses } from "@/lib/pharmacy/broadcast";
import { pickDeliveryAddress, type DeliveryAddress } from "@/lib/pharmacy/delivery-address";

export type AddressState =
  | { status: "loading" }
  /** The address the request would be sent with: the default one with a location, else the first with a location. */
  | { status: "ready"; address: DeliveryAddress & { lat: number; lng: number } }
  /** The patient has no saved address. */
  | { status: "none" }
  /** There are saved addresses, but none has a location, and a broadcast needs one. */
  | { status: "nolocation"; address: DeliveryAddress }
  | { status: "unauthenticated" }
  | { status: "error" };

/** The patient's delivery address, read once from GET /users/me/addresses. */
export function useDeliveryAddress(enabled = true): AddressState {
  const [state, setState] = useState<AddressState>({ status: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void loadDeliveryAddresses().then((result) => {
      if (!live) return;
      if (result.status !== "ok") return setState({ status: result.status });
      const picked = pickDeliveryAddress(result.addresses);
      if (picked) return setState({ status: "ready", address: picked });
      const first = result.addresses.find((a) => a.isDefault) ?? result.addresses[0];
      setState(first ? { status: "nolocation", address: first } : { status: "none" });
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return state;
}
