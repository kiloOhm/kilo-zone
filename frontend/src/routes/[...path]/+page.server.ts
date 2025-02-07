import { usePlatform } from "$lib";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, platform }) => {
  const {
    env: { BACKEND },
  } = usePlatform(platform);
  let pageData;
  const res = await BACKEND.fetch("/page/" + params.path);
  if (!res || !res.ok) {
    console.error("Failed to load page data", res);
  } else {
    pageData = await res.json();
  }
  return {
    page: {
      path: params.path,
      data: pageData,
    },
  };
};
