import { Hono } from "hono";
import { Ctx } from "../..";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { usePageService } from "./pages.service";

export const pageRouter = new Hono<Ctx>()

  // GET /:id
  .get(
    "/:path",
    zValidator(
      "param",
      z.object({
        path: z.string(),
      })
    ),
    async (c) => {
      const { getPages } = usePageService(c);
      const { path } = c.req.valid("param");
      const {
        data: [page],
      } = await getPages({
        filter: { path },
        pagination: { limit: 1 },
      });
      return c.json(page);
    }
  );
