import { useBackend } from "$lib";
import type { SPage } from "../../app";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad<{
  path: string;
  page: SPage | null;
}> = async ({ params, platform }) => {
  const { getPageData } = useBackend(platform);
  return {
    path: params.path,
    page: await getPageData(params.path),
  };
};
