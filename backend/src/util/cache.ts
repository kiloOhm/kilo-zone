import { Context } from 'hono';
import { Ctx } from '..';
import { z, ZodType } from 'zod';

export function useCache<T>(c: Context<Ctx>, validator: ZodType<T>) {
	const kv = c.env.KILO_ZONE_CACHE;
	return {
		async get(key: string): Promise<T | null> {
			const value = await kv.get(key);
			if (!value) {
				return null;
			}
			if (validator.description === 'string') {
				return z.string().parse(value) as T;
			} else {
				if (validator) {
					return (await validator.parseAsync(JSON.parse(value))) as T;
				} else {
					return JSON.parse(value) as T;
				}
			}
		},
		async set(key: string, value: T, options?: { ttl?: number }) {
			return kv.put(key, JSON.stringify(value), { expirationTtl: options?.ttl });
		},
		async delete(key: string) {
			return kv.delete(key);
		},
	};
}
