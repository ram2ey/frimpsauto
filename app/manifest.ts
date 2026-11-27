import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Frimps Auto",
    short_name: "Frimps Auto",
    description: "Mercedes-Benz workshop management",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#eaf3fa",
    theme_color: "#0860a0",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
