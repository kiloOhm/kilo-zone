import { WorkerEntrypoint } from "cloudflare:workers";
import { usePageService } from "./pages.service";
import { Ctx } from "../..";
import type { IRPC } from "@shared/types";
import { GenericPage } from "./pages";

export class RPC extends WorkerEntrypoint<Ctx["Bindings"]> implements IRPC {
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
