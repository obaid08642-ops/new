import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nabd Plus",
    short_name: "Nabd Plus",
    description: "Nabd Plus patient portal",
    start_url: "/ar",
    display: "standalone",
    background_color: "#f6fbfc",
    theme_color: "#078494",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
