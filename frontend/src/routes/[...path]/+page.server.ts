import { useBackend } from "$lib";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, platform }) => {
  const { getPageData } = useBackend(platform);
  return {
    page: {
      path: params.path,
      data: await getPageData(params.path),
    },
  };
};
