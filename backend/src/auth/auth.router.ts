import { Hono } from 'hono';
import { Ctx } from '..';
import { useAuthService } from './auth.service';
import { BadRequestError } from '../util/errors';

export const authRouter = new Hono<Ctx>();

authRouter.get('/login', async (c) => {
	return c.text('Login');
});

authRouter.get('/callback', async (c) => {
	const code = c.req.query('code');
	if (!code) {
		throw new BadRequestError('No code provided');
	}
	const stateString = c.req.query('state');
	const state = new URLSearchParams(stateString);
	const nonce = state.get('nonce');
	if (!nonce) {
		throw new BadRequestError('No nonce provided');
	}
	const { getTokens, setSessionCookie } = useAuthService(c);
	const token = await getTokens(code, nonce);
	const cookie = state.get('cookie');
	if (cookie) {
		await setSessionCookie(token, cookie);
	}
	const redirect = state.get('redirect');
	if (redirect) {
		return c.redirect(redirect);
	}
	return c.text('Callback');
});
