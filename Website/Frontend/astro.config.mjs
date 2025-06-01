// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
// import sitemap from "@astrojs/sitemap"; // Example: if you have sitemap

// Import the plugins
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  redirects: {
    "/": "/predict", // Redirect root path to /predict
    // You can add more redirects here if needed
    // '/old-page': '/new-page',
    // '/another': { status: 302, destination: '/temp-location' }
  },
  integrations: [react()],
  // site: "https://your-deployment-url.vercel.app", // Replace with your actual URL
  vite: {
    plugins: [wasm(), topLevelAwait(), tailwindcss()],
    optimizeDeps: {
      exclude: ["voy-search"],
    }
  },
});