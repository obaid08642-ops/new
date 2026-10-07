"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { resolveErrorCopy, type ErrorCopy } from "./catalog";

/**
 * P15.1 — localized message + next step for any failure, in the current locale.
 *
 * The fetch layer stays locale-free so it can be unit-tested in node; the
 * locale only exists here, at render time.
 */
export function useErrorCopy(): (error: unknown) => ErrorCopy {
  const errors = useTranslations("Errors");
  const network = useTranslations("Network");
  return useCallback((error: unknown) => resolveErrorCopy(errors, network, error), [errors, network]);
}
