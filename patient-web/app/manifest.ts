import type { MetadataRoute } from "next";
import { THEME_COLOR } from "./design-tokens/theme-color";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nabd Plus",
    short_name: "Nabd Plus",
    // i18n-ok: the web app manifest description (English by design)
    description: "Nabd Plus patient portal",
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLOR.light,
    theme_color: "#D42A38",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
