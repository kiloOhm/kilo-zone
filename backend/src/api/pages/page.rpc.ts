import { WorkerEntrypoint } from "cloudflare:workers";
import { usePageService } from "./pages.service";
import { Ctx } from "../..";
import { GenericPage } from "./pages.db";

export class RPC extends WorkerEntrypoint<Ctx["Bindings"]> {
  async getPage(path: string): Promise<GenericPage | null> {
    const { getPages } = usePageService(this.env);
    try {
      const {
        data: [page],
      } = await getPages({
        filter: { path },
        pagination: { limit: 1 },
      });
      if (!page) return null;
      return page;
    } catch {
      return null;
    }
  }
}
