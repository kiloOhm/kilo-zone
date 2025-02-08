export async function encryptString(plainText: string, secretKey: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'PBKDF2' }, false, ['deriveKey']);

	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: 100000,
			hash: 'SHA-256',
		},
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt']
	);

	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		encoder.encode(plainText)
	);

	// Combine salt, iv, and encrypted data
	const encryptedArray = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
	return btoa(String.fromCharCode(...encryptedArray));
}

export async function decryptString(encryptedText: string, secretKey: string): Promise<string> {
	const encryptedData = Uint8Array.from(atob(encryptedText), (c) => c.charCodeAt(0));

	const salt = encryptedData.slice(0, 16);
	const iv = encryptedData.slice(16, 28);
	const encrypted = encryptedData.slice(28);

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'PBKDF2' }, false, ['deriveKey']);

	const key = await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: 100000,
			hash: 'SHA-256',
		},
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['decrypt']
	);

	const decrypted = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		encrypted
	);

	return decoder.decode(decrypted);
}

export function b64(str: string): string {
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(length: number) {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return result;
}
