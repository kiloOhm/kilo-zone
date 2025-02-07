import { Context, Next } from 'hono';
import { Ctx } from '..';
import { ForbiddenError, UnauthorizedError } from '../util/errors';
import { AccessToken, accessTokenSchema, IdToken, useAuthService } from './auth.service';
import { KZScope, kzScopes } from './scopes';
import { z } from 'zod';
import { generateCodeVerifier, generateCodeChallenge } from '../util/pkce';
import { useCache } from '../util/cache';
import { startTimer } from '../util/timing';

const defaultScopes = ['openid', 'profile', 'email', 'offline_access'];

export function authenticate(options: {
	requestScopes?: KZScope[];
	requiredScopes?: KZScope[];
	onFail?: 'throw' | 'redirect' | 'next';
	exclude?: string[];
	cookie: string;
}) {
	options.onFail ??= 'throw';
	return async (c: Context<Ctx>, next: Next) => {
		const idpBaseUrl = c.env.AUTH_URL;
		const clientId = c.env.CLIENT_ID;
		const redirectUri = c.env.REDIRECT_URI;
		const exclude = new Set(options.exclude);
		const audience = c.env.API_AUDIENCE;
		exclude.add('/auth/*');
		if (
			[...exclude].some((ex) => {
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
			return await next();
		}
		let accessToken: AccessToken | null = null;
		let idToken: IdToken | null = null;
		const upstreamAuth = getAuth(c);
		if (upstreamAuth) {
			accessToken = upstreamAuth.accessToken;
			idToken = upstreamAuth.idToken;
		}
		if (!accessToken) {
			const { verifyJWT, getSessionCookie, refreshAccessToken } = useAuthService(c);
			const authHeader = c.req.header('Authorization');
			if (authHeader) {
				const [type, value] = authHeader.split(' ');
				if (type?.toLowerCase() !== 'bearer') {
					throw new UnauthorizedError('Invalid Authorization type');
				}
				accessToken = await accessTokenSchema.parseAsync(await verifyJWT(value));
			}
			if (options.cookie) {
				const session = await getSessionCookie(options.cookie);
				if (session) {
					idToken = session.idToken;
					if (session.refreshToken) {
						accessToken = await refreshAccessToken(session.refreshToken);
					}
				}
			}
		}
		if (!accessToken) {
			if (options.onFail === 'redirect') {
				const codeVerifier = generateCodeVerifier();
				const codeChallenge = await generateCodeChallenge(codeVerifier);
				const nonce = new TextDecoder().decode(crypto.getRandomValues(new Uint8Array(32)));
				const code_verifierCache = useCache(c, z.string());
				await code_verifierCache.set('code_verifier:' + nonce, codeVerifier, { ttl: 10 * 60 }); // 10 minutes
				const state = new URLSearchParams();
				state.append('redirect', c.req.url);
				if (options.cookie) {
					state.append('cookie', options.cookie);
				}
				state.append('nonce', nonce);
				const params = new URLSearchParams();
				params.append('client_id', clientId);
				params.append('redirect_uri', redirectUri);
				const distinctScopes = new Set<string>([...(options.requestScopes ?? []), ...(options.requiredScopes ?? [])]);
				for (const scope of defaultScopes) {
					distinctScopes.add(scope);
				}
				params.append('scope', [...distinctScopes].join(' '));
				params.append('response_type', 'code');
				params.append('state', state.toString());
				params.append('audience', audience);
				params.append('code_challenge', codeChallenge);
				params.append('code_challenge_method', 'S256');
				// params.append('prompt', 'login');
				return c.redirect(`${idpBaseUrl}/authorize?${params.toString()}`);
			} else if (options.onFail === 'throw') {
				throw new UnauthorizedError();
			}
		}
		// check scopes
		if (options.requiredScopes) {
			if (!accessToken) {
				throw new UnauthorizedError();
			}
			const rawScopes = accessToken.scope.split(' ').filter((s) => Boolean(s) && !defaultScopes.includes(s));
			const validatedScopes = await z.array(z.enum(kzScopes)).parseAsync(rawScopes);
			const missingScopes = options.requiredScopes.filter((s) => !validatedScopes.includes(s));
			if (missingScopes.length > 0) {
				throw new ForbiddenError(`Missing scopes: ${missingScopes.join(', ')}`);
			}
		}
		if (accessToken) {
			c.set('auth', { idToken, accessToken });
		}
		return await next();
	};
}

export function getAuth(c: Context<Ctx>): { idToken: IdToken | null; accessToken: AccessToken } | null {
	return c.get('auth');
}
