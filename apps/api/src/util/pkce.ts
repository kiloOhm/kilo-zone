import { b64 } from './crypto';

export function generateCodeVerifier(): string {
	const length = Math.floor(Math.random() * 85) + 43;
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return b64(String.fromCharCode(...array));
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const base64url = b64(String.fromCharCode(...hashArray));
	return base64url;
}
