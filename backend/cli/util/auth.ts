import { accessTokenSchema, idTokenSchema, tokenResponseSchema, type AccessToken, type IdToken } from '../../src/auth/auth.service';
import { bindMethods } from '../../src/util/js';
import { type RS256Token, jwkSchema } from '../../src/auth/auth.service';
import { decode, verify } from 'jsonwebtoken';
import { z } from 'zod';
import type { JsonWebKeyInput } from 'crypto';
import { getPassword, deletePassword, setPassword } from 'keytar';

const clientId = 'dhfXRO3q5eX1gQW3GYTYBHNflnEbeN56';
const domain = 'dev-3drwq1geovbl2vjr.eu.auth0.com';

const cachedPublicKeys = new Map<string, JsonWebKey>();

const state: {
	idToken: IdToken | null;
	accessToken: string | null;
	exp: number | null;
	refreshToken: string | null;
} = {
	accessToken: null,
	exp: null,
	idToken: null,
	refreshToken: null,
};

export function useAuth() {
	return bindMethods({
		state,
		async init() {
			const stored = await getPassword('kilo-zone-cli', 'session');
			if (stored) {
				const { idToken, refreshToken, access_token, exp } = z
					.object({
						access_token: z.string().optional(),
						exp: z.number().optional().nullable(),
						idToken: idTokenSchema,
						refreshToken: z.string(),
					})
					.parse(JSON.parse(stored));
				if (access_token && exp && exp * 1000 < Date.now()) {
					state.accessToken = access_token;
					state.idToken = idToken;
				}
				state.idToken = idToken;
				state.refreshToken = refreshToken;
			}
			return state;
		},
		async checkAuth() {
			if (!state.refreshToken) {
				throw new Error('Not authenticated, run `kz login`');
			} else if (!state.accessToken || (state.exp && state.exp * 1000 < Date.now())) {
				await this.refresh();
			}
		},
		whoami() {
			console.log({ state });
		},
		async refresh() {
			if (!state.refreshToken) {
				throw new Error('No refresh token');
			}
			const response = await fetch(`https://${domain}/oauth/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					client_id: clientId,
					grant_type: 'refresh_token',
					refresh_token: state.refreshToken,
					audience: 'kilo.zone/api',
				}),
			});
			const data = await response.json();
			const tokenResponse = await tokenResponseSchema.parseAsync(data);
			if (!tokenResponse.access_token) {
				throw new Error('No access token');
			}
			state.accessToken = tokenResponse.access_token;
			if (!tokenResponse.refresh_token) {
				throw new Error('No refresh token');
			}
			state.refreshToken = tokenResponse.refresh_token;
			state.exp = tokenResponse.expires_in;
			await setPassword('kilo-zone-cli', 'session', JSON.stringify(state));
		},
		async deviceFlow() {
			const response = await fetch(`https://${domain}/oauth/device/code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					client_id: clientId,
					scope: 'openid profile email offline_access',
					audience: 'kilo.zone/api',
				}),
			});
			const data = await response.json();
			const { device_code, user_code, verification_uri_complete } = data;
			console.log(`Visit ${verification_uri_complete} and enter ${user_code}`);
			let attempts = 0;
			return new Promise<void>(async (resolve, reject) => {
				const interval = setInterval(async () => {
					console.log('Polling');
					try {
						const response = await fetch(`https://${domain}/oauth/token`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								client_id: clientId,
								grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
								device_code,
								audience: 'kilo.zone/api',
							}),
						});
						const data = await response.json();
						const tokenResponse = await tokenResponseSchema.parseAsync(data);
						if (tokenResponse) {
							clearInterval(interval);
							const idTokenVerified = await this.verifyJWT(tokenResponse.id_token);
							const idToken = await idTokenSchema.parseAsync(idTokenVerified);
							state.idToken = idToken;
							if (!tokenResponse.access_token) {
								return reject(new Error('No access token'));
							}
							state.accessToken = tokenResponse.access_token;
							if (!tokenResponse.refresh_token) {
								return reject(new Error('No refresh token'));
							}
							state.refreshToken = tokenResponse.refresh_token;
							state.exp = tokenResponse.expires_in;
							await setPassword(
								'kilo-zone-cli',
								'session',
								JSON.stringify({
									idToken,
									refreshToken: tokenResponse.refresh_token,
									access_token: tokenResponse.access_token,
									exp: tokenResponse.expires_in,
								})
							);
							console.log('Authenticated as ' + (idToken.nickname ?? idToken.name ?? idToken.sub) + ' (' + idToken.email + ')');
							return resolve();
						}
					} catch (e) {
						if (attempts++ > 50) {
							clearInterval(interval);
							reject(new Error('Timeout'));
						}
					}
				}, 5000);
			});
		},
		async logout() {
			state.accessToken = null;
			state.idToken = null;
			state.refreshToken = null;
			state.exp = null;
			await deletePassword('kilo-zone-cli', 'session');
			console.log('Logged out');
		},
		async verifyJWT(jwtString: string) {
			const decoded = decode(jwtString, { complete: true });
			if (!decoded || typeof decoded === 'string') {
				throw new Error('Invalid token');
			}
			// check token type
			if (decoded.header.typ !== 'JWT') {
				throw new Error('Invalid token type');
			}
			// check if RS256
			if (decoded.header.alg !== 'RS256') {
				throw new Error('Invalid token algorithm');
			}
			const RS256Token = decoded as RS256Token;
			// check issuer
			if (
				RS256Token.payload.iss !== domain &&
				RS256Token.payload.iss !== `${domain}/` &&
				RS256Token.payload.iss !== `https://${domain}/` &&
				RS256Token.payload.iss !== `https://${domain}`
			) {
				throw new Error(`Invalid issuer: ${RS256Token.payload.iss}`);
			}
			// check if public key is cached
			let publicKey: JsonWebKey;
			const cachedPublicKey = cachedPublicKeys.get(`public-key-${RS256Token.payload.iss}-${RS256Token.header.kid}`);
			if (cachedPublicKey) {
				publicKey = cachedPublicKey;
			} else {
				// fetch public key
				const res = await fetch(`https://${domain}/.well-known/jwks.json`);
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
				cachedPublicKeys.set(`public-key-${RS256Token.payload.iss}`, publicKey);
			}
			// verify token
			return verify(
				jwtString,
				{
					format: 'jwk',
					key: publicKey,
				} as JsonWebKeyInput,
				{
					algorithms: ['RS256'],
				}
			);
		},
	});
}
