"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Uploads gate: GET /config serves features.uploads_enabled, false while the virus scanner cannot answer and every
 * upload would fail. The locale layout reads it on the server (fail-open) and hands it down here, so each upload entry
 * point hides its button instead of showing a form that fails.
 */
const UploadsContext = createContext<boolean>(true);

export function UploadsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <UploadsContext.Provider value={enabled}>{children}</UploadsContext.Provider>;
}

export const useUploadsEnabled = (): boolean => useContext(UploadsContext);

/** The notice that stands in for an upload control while uploads are off. */
export function UploadsUnavailable({ className }: { className?: string }) {
  const t = useTranslations("Shared");
  return <p role="status" className={className} data-uploads-unavailable="">{t("uploadsUnavailable")}</p>;
}

/** Renders its children (the upload controls) while uploads are on, the notice otherwise. */
export function UploadsGate({ children, className }: { children: ReactNode; className?: string }) {
  return useUploadsEnabled() ? <>{children}</> : <UploadsUnavailable className={className} />;
}
