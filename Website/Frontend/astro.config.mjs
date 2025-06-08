// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import tailwind from "@astrojs/tailwind";
import react from '@astrojs/react';
import sitemap from "@astrojs/sitemap";

// Import the plugins
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  // redirects: {
  //   "/": "/predict", // Redirect root path to /predict
  // },
  integrations: [react(), sitemap()],
  site: "https://pune.adityajoshi.in",
  vite: {
    plugins: [wasm(), topLevelAwait(), tailwindcss()],
    optimizeDeps: {
      exclude: ["voy-search"],
    }
  },
});