import { Context, Next } from 'hono';
import { Ctx } from '..';
import { TooManyRequestsError } from './errors';
import { useCache } from './cache';
import { getAuth } from '../auth/authenticate.middleware';
import { z } from 'zod';

export type RateLimitOptions = {
	maxRequestsPerWindow: number;
	windowDuration: number;
};
export function rateLimit(options: { key?: string; anonymous?: RateLimitOptions; authenticated: RateLimitOptions; exclude?: string[] }) {
	return {
		async limit(c: Context<Ctx>, next: Next) {
			const cache = useCache<Connection>(c, connectionSchema);
			if (
				options.exclude?.some((ex) => {
					for (let i = 0; i < ex.length; i++) {
						if (ex[i] === '*') {
							return true;
						}
						if (c.req.path[i] !== ex[i]) {
							return false;
						}
					}
					return true;
				})
			) {
				return next();
			}
			const skipSecret = c.req.header('x-ratelimit-skip');
			const isAuth = getAuth(c)?.accessToken !== null;
			const { maxRequestsPerWindow: max, windowDuration: duration } = isAuth
				? options.authenticated
				: options.anonymous ?? options.authenticated;
			if (skipSecret === c.env.RATE_LIMIT_SKIP_SECRET) {
				return next();
			}
			const ip = c.env.DEV ? '127.0.0.1' : c.req.header('cf-connecting-ip');
			if (!ip) {
				return c.json({ error: 'No IP provided' }, { status: 400 });
			}
			function reset() {
				return cache.delete(`rate-limit-${ip}`);
			}
			c.set('resetRateLimit', reset);
			const key = `rate-limit-${ip}` + (options.key ? `-${options.key}` : '');
			const connection = await cache.get(key);
			if (!connection) {
				await cache.set(
					key,
					{ ip, requests: [new Date()] },
					{
						ttl: duration / 1000,
					}
				);
				return next();
			}
			const now = new Date();
			const requests = connection.requests.filter((r) => new Date(r).getTime() > now.getTime() - duration);
			if (requests.length >= max) {
				throw new TooManyRequestsError('Too many requests');
			}
			requests.push(now);
			await cache.set(
				key,
				{ ip, requests },
				{
					ttl: duration / 1000,
				}
			);
			return next();
		},
	};
}

export const connectionSchema = z.object({
	ip: z.string(),
	requests: z.array(z.date({ coerce: true })),
});
export type Connection = z.infer<typeof connectionSchema>;
