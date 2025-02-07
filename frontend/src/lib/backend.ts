import { bindMethods } from "./util/js";

export function useBackend(platform: App.Platform | undefined) {
  const dev = import.meta.env.DEV;
  const baseUrl = dev ? "http://localhost:8787" : "https://api.kilo.zone";
  if (!platform) throw new Error("Platform is required");
  return bindMethods({
    async getPageData(path: string) {
      const url = new URL(`${baseUrl}/page/${path}`);
      if (dev) {
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
      } else {
        const res = await platform.env.BACKEND.fetch(url);
        return res.ok ? await res.json() : null;
      }
    },
  });
}
