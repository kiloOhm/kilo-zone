import { Context } from 'hono';
import { Ctx } from '..';
import { drizzle } from 'drizzle-orm/d1';

export function useDb(c: Context<Ctx>) {
	return drizzle(c.env.KILO_ZONE_DB);
}
