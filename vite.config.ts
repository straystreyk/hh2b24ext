import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import manifest from "./manifest.json";
import { crx } from "@crxjs/vite-plugin";
import postcssNesting from "postcss-nesting";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr(), crx({ manifest })],
  css: {
    postcss: {
      plugins: [postcssNesting],
    },
  },
});
