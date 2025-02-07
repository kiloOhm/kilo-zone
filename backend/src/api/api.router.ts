import { Hono } from "hono";
import { Ctx } from "..";
import { authenticate } from "../auth/authenticate.middleware";
import { constants } from "../util/constants";
import { pagesRouter } from "./pages/pages.router";
import { objectsRouter } from "./objects/objects.router";
import { startTimer } from "../util/timing";
import { pageRouter } from "./pages/page.router";

export const apiRouter = new Hono<Ctx>()
  .route("/page", pageRouter)
  .use("*", async (c, next) => {
    const stop = startTimer("api auth");
    await authenticate({ onFail: "throw", cookie: constants.AUTH_COOKIE_NAME, requestScopes: ["use:pages"] })(c, next);
    stop();
  })
  .route("/pages", pagesRouter)
  .route("/objects", objectsRouter);
