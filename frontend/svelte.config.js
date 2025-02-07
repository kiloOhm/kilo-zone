import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
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
