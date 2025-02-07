import { bindMethods } from "./util/js";

export function useBackend(platform: App.Platform | undefined) {
  const dev = import.meta.env.DEV;
  if (!platform) throw new Error("Platform is required");
  return bindMethods({
    async getPageData(path: string) {
      if (dev) {
        const res = await fetch(`http://localhost:8787/page/${path}`);
        return res.ok ? await res.json() : null;
      } else {
        const res = await platform.env.BACKEND.fetch(`/page/${path}`);
        return res.ok ? await res.json() : null;
      }
    },
  });
}
