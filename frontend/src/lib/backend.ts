import type { GenericPage } from "../../../backend/src/api/pages/pages.db";
import { bindMethods } from "./util/js";
import type { Response as cfResponse } from "@cloudflare/workers-types";

type Res = cfResponse | Response;

export function useBackend(platform: App.Platform | undefined) {
  const dev = import.meta.env.DEV;
  if (!platform) throw new Error("Platform is required");
  return bindMethods({
    async getPageData(path: string): Promise<GenericPage | null> {
      let res: Res | null = null;
      if (dev) {
        res = await fetch(`http://localhost:8787/page/${path}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch page data: ${res.statusText}`);
        }
        const {
          data: [page],
        } = await res.json();
        return page;
      } else {
        return await platform.env.BACKEND.getPage(path);
      }
    },
  });
}
