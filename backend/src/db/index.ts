import { Ctx } from "..";
import { drizzle } from "drizzle-orm/d1";

export function useDb(env: Ctx["Bindings"]) {
  return drizzle(env.KILO_ZONE_DB);
}
