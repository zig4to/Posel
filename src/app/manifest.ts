import type { MetadataRoute } from "next";

// PWA manifest — Next samodejno servira na /manifest.webmanifest in doda
// <link rel="manifest">. Ikone generira tools/make-icons.js (npm run icons).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Posel — Partnerji in koledar",
    short_name: "Posel",
    description: "Pregled partnerjev in delovnega urnika na enem mestu.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "sl",
    dir: "ltr",
    categories: ["productivity", "business"],
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
