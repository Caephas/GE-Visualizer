import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// GitHub Pages serves project sites from /<repo>/, so the deployed build takes
// its base path from BASE_PATH. Local dev, preview and the media capture stay at
// "/" so nothing else has to change.
//
// SITE_URL is the absolute origin used by the Open Graph / canonical tags, which
// have to be absolute. Set it when deploying to a custom domain.
const siteUrl = process.env.SITE_URL ?? "https://caephas.github.io/GE-Visualizer/";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    {
      name: "site-url",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", siteUrl),
    },
  ],
  // The Pyodide engine runs in a module Web Worker.
  worker: {
    format: "es",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
