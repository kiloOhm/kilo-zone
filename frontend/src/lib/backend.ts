import type { SPage } from "../app";
import { bindMethods } from "./util/js";

export function useBackend(platform: App.Platform | undefined) {
  if (!platform) throw new Error("Platform is required");
  return bindMethods({
    async getPageData(path: string): Promise<SPage | null> {
      return await platform.env.BACKEND.getPage(path);
    },
  });
}
