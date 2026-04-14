import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
  site: "https://edgepush.dev",
  output: "static",
  trailingSlash: "never",
  adapter: cloudflare(),
  integrations: [sitemap()],
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
  },
});
