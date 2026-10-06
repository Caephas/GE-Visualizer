import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// GitHub Pages serves project sites from /<repo>/, so the deployed build takes
// its base path from BASE_PATH. Local dev, preview and the media capture stay at
// "/" so nothing else has to change.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  // The Pyodide engine runs in a module Web Worker.
  worker: {
    format: "es",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
