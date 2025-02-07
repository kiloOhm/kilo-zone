export function usePlatform(platform: Readonly<App.Platform> | undefined) {
  if (!platform) {
    throw new Error("Platform is not defined");
  }
  return {
    env: {
      BACKEND: {
        fetch: import.meta.env.DEV
          ? async (input: RequestInfo, init?: RequestInit) => {
              if (typeof input === "string") {
                return await globalThis.fetch("http://localhost:8787" + input);
              } else if (input instanceof Request) {
                return await globalThis.fetch({
                  ...input,
                  url: "http://localhost:8787" + input.url,
                });
              }
            }
          : platform.env.BACKEND.fetch,
      },
    },
  };
}
