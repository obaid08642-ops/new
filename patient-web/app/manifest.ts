import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nabd Plus",
    short_name: "Nabd Plus",
    description: "Nabd Plus patient portal",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F5F7",
    theme_color: "#D42A38",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
