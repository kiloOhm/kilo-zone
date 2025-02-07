import { bindMethods } from "./util/js";
import type { Response as cfResponse } from "@cloudflare/workers-types";

type Res = cfResponse | Response;

export function useBackend(platform: App.Platform | undefined) {
  const dev = import.meta.env.DEV;
  if (!platform) throw new Error("Platform is required");
  return bindMethods({
    async getPageData(path: string) {
      let res: Res | null = null;
      if (dev) {
        res = await fetch(`http://localhost:8787/page/${path}`);
        return res.ok ? await res.json() : null;
      } else {
        return await platform.env.BACKEND.page(path);
      }
    },
  });
}
