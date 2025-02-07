import { Context, Next } from 'hono';
import { Ctx } from '..';
import { z } from 'zod';
import { verify, decode } from 'hono/jwt';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import {
	JWTPayload,
	JwtTokenExpired,
	JwtTokenInvalid,
	JwtHeaderInvalid,
	JwtAlgorithmNotImplemented,
	JwtTokenIssuedAt,
	JwtTokenNotBefore,
	JwtTokenSignatureMismatched,
} from 'hono/utils/jwt/types';
import { useCache } from '../util/cache';
import { decryptString, encryptString } from '../util/crypto';
import { bindMethods } from '../util/js';
import { UnauthorizedError } from '../util/errors';

const jwtErrorMap = new Map<new (...args: any[]) => Error, string>([
	[JwtTokenExpired, 'Token expired'],
	[JwtTokenInvalid, 'Token invalid'],
	[JwtHeaderInvalid, 'Header invalid'],
	[JwtAlgorithmNotImplemented, 'Algorithm not implemented'],
	[JwtTokenIssuedAt, 'Token issued at'],
	[JwtTokenNotBefore, 'Token not before'],
	[JwtTokenSignatureMismatched, 'Token signature mismatched'],
]);

export function useAuthService(c: Context<Ctx>) {
	const idpBaseUrl = c.env.AUTH_URL;
	const clientId = c.env.CLIENT_ID;
	const clientSecret = c.env.CLIENT_SECRET;
	const authSecret = c.env.AUTH_SECRET;
	const jwkCache = useCache(c, jwkSchema);
	const codeVerifierCache = useCache(c, z.string());

	return bindMethods({
		async verifyJWT(jwtString: string) {
			let decoded: { header: { typ?: string; alg: string }; payload: JWTPayload };
			try {
				decoded = decode(jwtString);
			} catch (e) {
				if (e instanceof Error) {
					for (const [ErrorType, errorMessage] of jwtErrorMap) {
						if (e instanceof ErrorType) {
							throw new UnauthorizedError(errorMessage);
						}
					}
				}
				// opaque token, use introspection
				const params = new URLSearchParams();
				params.append('token', jwtString);
				params.append('client_id', clientId);
				params.append('client_secret', clientSecret);
				params.append('token_type_hint', 'access_token');
				const res = await fetch(`${idpBaseUrl}/oauth/introspect`, {
					method: 'POST',
					body: params,
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				});
				const data = await res.json();
				const { active } = await z
					.object({
						active: z.boolean(),
					})
					.parseAsync(data);
				if (!active) {
					throw new UnauthorizedError('Token not active');
				}
				return data;
			}
			// check token type
			if (decoded.header.typ !== 'JWT') {
				throw new UnauthorizedError('Invalid token type');
			}
			// check if RS256
			if (decoded.header.alg !== 'RS256') {
				throw new UnauthorizedError('Invalid token algorithm');
			}
			const RS256Token = decoded as RS256Token;
			// check issuer
			if (RS256Token.payload.iss !== idpBaseUrl && RS256Token.payload.iss !== `${idpBaseUrl}/`) {
				throw new UnauthorizedError(`Invalid issuer: ${RS256Token.payload.iss}`);
			}
			// check audience
			if (Array.isArray(RS256Token.payload.aud) && !RS256Token.payload.aud.includes(c.env.API_AUDIENCE)) {
				throw new UnauthorizedError('Invalid audience');
			}
			// check if public key is cached
			let publicKey: Jwk;
			const pbkCacheKey = `public-key-${RS256Token.payload.iss}-${RS256Token.header.kid}`;
			const cachedPublicKey = await jwkCache.get(pbkCacheKey);
			if (cachedPublicKey) {
				publicKey = await jwkSchema.parseAsync(cachedPublicKey);
			} else {
				// fetch public key
				const res = await fetch(`${idpBaseUrl}/.well-known/jwks.json`);
				const data = await res.json();
				// validate Response
				const jwks = await z
					.object({
						keys: z.array(jwkSchema),
					})
					.parseAsync(data);
				// get public key by kid
				const foundPublicKey = jwks.keys.find((key) => key.kid === RS256Token.header.kid);
				if (!foundPublicKey) {
					throw new Error('Public key not found');
				}
				publicKey = foundPublicKey;
				// cache public key
				await jwkCache.set(pbkCacheKey, publicKey, {
					ttl: publicKey?.exp ? publicKey.exp - Date.now() : 60 * 60, // 1 hour
				});
			}
			// verify token
			try {
				return await verify(jwtString, publicKey, 'RS256');
			} catch (e) {
				if (e instanceof Error) {
					for (const [ErrorType, errorMessage] of jwtErrorMap) {
						if (e instanceof ErrorType) {
							throw new UnauthorizedError(errorMessage);
						}
					}
				}
				throw e;
			}
		},
		async getTokens(code: string, nonce: string) {
			const code_verifier = await codeVerifierCache.get(`code_verifier:${nonce}`);
			if (!code_verifier) {
				throw new Error('Code verifier not found');
			}
			const params = new URLSearchParams();
			params.append('client_id', clientId);
			params.append('client_secret', clientSecret);
			params.append('code', code);
			params.append('grant_type', 'authorization_code');
			params.append('redirect_uri', c.env.REDIRECT_URI);
			params.append('code_verifier', code_verifier);
			const res = await fetch(`${idpBaseUrl}/oauth/token`, {
				method: 'POST',
				body: params,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			const data = await res.json();
			console.log({
				res,
				data,
			});
			codeVerifierCache.delete(`code_verifier:${nonce}`);
			return await tokenResponseSchema.parseAsync(data);
		},
		async refreshAccessToken(refreshToken: string) {
			const params = new URLSearchParams();
			params.append('client_id', clientId);
			params.append('client_secret', clientSecret);
			params.append('refresh_token', refreshToken);
			params.append('grant_type', 'refresh_token');
			const res = await fetch(`${idpBaseUrl}/oauth/token`, {
				method: 'POST',
				body: params,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			const data = await res.json();
			const tokenResponse = await tokenResponseSchema.parseAsync(data);
			return await accessTokenSchema.parseAsync(await this.verifyJWT(tokenResponse.access_token));
		},
		async setSessionCookie(tokenResponse: TokenResponse, cookieName: string) {
			const idToken = await idTokenSchema.parseAsync(await this.verifyJWT(tokenResponse.id_token));
			const sessionCookie: SessionCookie = {
				idToken,
				refreshToken: tokenResponse.refresh_token,
			};
			await setSignedCookie(c, cookieName, await encryptString(JSON.stringify(sessionCookie), authSecret), authSecret, {
				expires: new Date(Date.now() + tokenResponse.expires_in * 1000),
				sameSite: 'strict',
				secure: !c.env.DEV,
				signingSecret: authSecret,
			});
		},
		async getSessionCookie(cookieName: string) {
			const encryptedCookie = await getSignedCookie(c, authSecret, cookieName);
			if (!encryptedCookie) {
				return null;
			}
			const sessionCookie = await sessionCookieSchema.parseAsync(JSON.parse(await decryptString(encryptedCookie, authSecret)));
			return sessionCookie;
		},
	});
}

export const tokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	id_token: z.string(),
	expires_in: z.number(),
	token_type: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const idTokenSchema = z.object({
	iss: z.string(),
	sub: z.string(),
	aud: z.union([z.string(), z.array(z.string())]),
	exp: z.number(),
	iat: z.number(),
	email: z.string(),
	email_verified: z.boolean(),
	nickname: z.string().optional(),
	name: z.string().optional(),
});
export type IdToken = z.infer<typeof idTokenSchema>;

export const accessTokenSchema = z.object({
	iss: z.string(),
	sub: z.string(),
	aud: z.union([z.string(), z.array(z.string())]),
	exp: z.number(),
	iat: z.number(),
	scope: z.string(),
});
export type AccessToken = z.infer<typeof accessTokenSchema>;

export const jwkSchema = z.object({
	kid: z.string(),
	kty: z.string(),
	use: z.string(),
	n: z.string(),
	e: z.string(),
	exp: z.number().optional(),
	iat: z.number().optional(),
	nbf: z.number().optional(),
	alg: z.string().optional(),
	x5t: z.string().optional(),
	x5c: z.array(z.string()).optional(),
});
export type Jwk = z.infer<typeof jwkSchema>;

export type RS256Token = {
	header: {
		alg: 'RS256';
		kid: string;
	};
	payload: JWTPayload;
};

export const sessionCookieSchema = z.object({
	idToken: idTokenSchema,
	refreshToken: z.string().optional(),
});
export type SessionCookie = z.infer<typeof sessionCookieSchema>;
