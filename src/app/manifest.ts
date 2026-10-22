import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money",
    short_name: "Money",
    description: "Mes comptes, classés tout seuls.",
    start_url: "/",
    display: "standalone",
    background_color: "#11131b",
    theme_color: "#11131b",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
