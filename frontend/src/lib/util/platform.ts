import {
  Request,
  type RequestInfo as cfRequestInfo,
  type RequestInit as cfRequestInit,
} from "@cloudflare/workers-types";

export function usePlatform(platform: Readonly<App.Platform> | undefined) {
  if (!platform) {
    throw new Error("Platform is not defined");
  }
  console.log("Platform", platform);
  console.log("Platform env", platform?.env);
  console.log("Platform env BACKEND", platform?.env?.BACKEND);
  return {
    env: {
      BACKEND: {
        fetch: import.meta.env.DEV
          ? async (input: RequestInfo, init?: RequestInit) => {
              console.log("dev fetch", input, init);
              if (typeof input === "string") {
                return await fetch("http://localhost:8787" + input, init);
              } else if (input instanceof Request) {
                return await fetch(
                  {
                    ...input,
                    url: "http://localhost:8787" + input.url,
                  },
                  init
                );
              }
            }
          : async (input: cfRequestInfo, init?: cfRequestInit) => {
              console.log("prod fetch", input, init);
              if (typeof input === "string") {
                return await platform.env.BACKEND.fetch(new Request("https://api.kilo.zone" + input, init));
              } else if (input instanceof Request) {
                return await platform.env.BACKEND.fetch(new Request("https://api.kilo.zone" + input.url, input));
              }
            },
      },
    },
  };
}
