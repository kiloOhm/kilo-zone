import { Hono } from "hono";
import { errorHandler } from "./util/errors";
import { rateLimit } from "./util/ratelimit";
import { apiRouter } from "./api/api.router";
import { authRouter } from "./auth/auth.router";
import { AccessToken, IdToken } from "./auth/auth.service";
import { startTimer, stopAllRunningTimers } from "./util/timing";
export { ChatHandlerDO } from "./durableObjects/ChatHandlerDO";
import * as PostalMime from "postal-mime";
import { cleanup } from "./api/pages/pages.service";

type Secrets = {
  RATE_LIMIT_SKIP_SECRET: string;
  AUTH_SECRET: string;
  CLIENT_SECRET: string;
  OBJECT_STORAGE_SIGNING_SECRET: string;
};

export type Ctx = {
  Bindings: Env & Secrets;
  Variables: {
    resetRateLimit: () => Promise<void>;
    auth: {
      idToken: IdToken | null;
      accessToken: AccessToken;
    };
    code_verifier: string;
  };
};

const service = new Hono<Ctx>();

service.use(async (c, next) => {
  startTimer("total");
  try {
    await next();
  } catch {
  } finally {
    stopAllRunningTimers();
  }
});

const { limit } = rateLimit({
  anonymous: { maxRequestsPerWindow: 5, windowDuration: 1 * 60 * 1000 }, // 5 requests per minute
  authenticated: { maxRequestsPerWindow: 50, windowDuration: 1 * 60 * 1000 }, // 50 requests per minute
  exclude: ["/auth/*", "/callback", "/login"],
});
service.use("*", async (c, next) => {
  const stop = startTimer("rateLimit");
  try {
    await limit(c, next);
  } catch {
  } finally {
    stop();
  }
});

service.route("/auth", authRouter);

service.route("/", apiRouter);

service.onError(errorHandler);

export default {
  fetch: service.fetch,
  email: async (msg, c) => {
    const headers = new Map<string, string>();
    msg.headers.forEach((v, k) => headers.set(k, v));
    const parser = new PostalMime.default();
    const rawEmail = new Response(msg.raw);
    const email = await parser.parse(await rawEmail.arrayBuffer());
    console.log({ email });
  },
  scheduled: async (c, env) => {
    console.log("scheduled cleanup");
    await cleanup(env);
  },
} satisfies ExportedHandler<Env>;

export type ServiceType = typeof apiRouter;
