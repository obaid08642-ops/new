export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
}

export function localizedUrl(locale: "ar" | "en", path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}/${locale}${path === "" ? "" : suffix}`;
}
