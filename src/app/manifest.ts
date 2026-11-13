import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "કર્ણાવતી પાર્લર",
    short_name: "કર્ણાવતી",
    description: "માલ, વકરો અને નફાનો હિસાબ",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7e8",
    theme_color: "#7a1f2b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
