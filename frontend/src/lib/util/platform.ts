import type { Request as cfRequest } from "@cloudflare/workers-types";

export function usePlatform(platform: Readonly<App.Platform> | undefined) {
  if (!platform) {
    throw new Error("Platform is not defined");
  }

  return {
    env: {
      BACKEND: {
        fetch: import.meta.env.DEV
          ? async (input: RequestInfo, init?: RequestInit) => {
              console.log("dev fetch", input, init);
              if (typeof input === "string") {
                return fetch("http://localhost:8787" + input, init);
              } else if (input instanceof Request) {
                return fetch(
                  new Request("http://localhost:8787" + input.url, {
                    method: input.method,
                    headers: input.headers,
                    body: input.body ? await input.text() : null,
                  }),
                  init
                );
              }
              throw new Error("Invalid fetch input");
            }
          : async (input: RequestInfo, init?: RequestInit) => {
              console.log("prod fetch", input, init);
              if (!platform.env.BACKEND) {
                throw new Error("Platform BACKEND environment is not available");
              }

              let request: Request;
              if (typeof input === "string") {
                request = new Request("https://api.kilo.zone" + input, init);
              } else if (input instanceof Request) {
                request = new Request("https://api.kilo.zone" + input.url, {
                  method: input.method,
                  headers: input.headers,
                  body: input.body ? await input.text() : null,
                });
              } else {
                throw new Error("Invalid fetch input");
              }

              const response = await platform.env.BACKEND.fetch(request as unknown as cfRequest);
              if (!(response instanceof Response)) {
                throw new Error("Service binding did not return a valid Response object.");
              }
              return response;
            },
      },
    },
  };
}
