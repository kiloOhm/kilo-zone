export function usePlatform(platform: Readonly<App.Platform> | undefined) {
  if (!platform) {
    throw new Error("Platform is not defined");
  }
  console.log("Platform", platform);
  console.log({
    globalThisFetch: globalThis.fetch,
    platformFetch: platform.env.BACKEND?.fetch,
  });
  return {
    env: {
      BACKEND: {
        fetch: import.meta.env.DEV
          ? async (input: RequestInfo, init?: RequestInit) => {
              if (typeof input === "string") {
                return await globalThis.fetch("http://localhost:8787" + input, init);
              } else if (input instanceof Request) {
                return await globalThis.fetch(
                  {
                    ...input,
                    url: "http://localhost:8787" + input.url,
                  },
                  init
                );
              }
            }
          : platform.env.BACKEND?.fetch,
      },
    },
  };
}
