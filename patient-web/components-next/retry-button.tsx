"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function RetryButton() {
  const router = useRouter();
  const t = useTranslations("RouteState");
  return <button className="button button-secondary" type="button" onClick={() => router.refresh()}>{t("retry")}</button>;
}
