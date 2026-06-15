import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const isMap = mode === "map"

  return {
    plugins: [svelte()],
    build: {
      outDir: "dist",
      emptyOutDir: false,
      lib: {
        entry: isMap ? "src/map.ts" : "src/main.ts",
        name: isMap ? "BobMapClient" : "BobPlanClient",
        formats: ["iife"],
        fileName: () => isMap ? "map.js" : "plan.js",
        cssFileName: isMap ? "map" : "plan",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  }
})
