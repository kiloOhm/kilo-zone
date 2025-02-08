import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    alias: {
      "@shared/types": "../../packages/types/src/index.d.ts",
      "@shared/util": "../../packages/util/src",
      "@shared/util/*": "../../packages/util/src/*",
    },
  },
  extensions: [".svelte", ".svx"],
  platformProxy: {
    configPath: "wrangler.toml",
    environment: undefined,
    experimentalJsonConfig: false,
    persist: false,
  },
};

export default config;
