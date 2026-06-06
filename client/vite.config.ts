import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/main.ts",
      name: "BobPlanClient",
      formats: ["iife"],
      fileName: () => "plan.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
