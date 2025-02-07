export function bindMethods<T extends Object>(obj: T): T {
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === 'function') {
			(obj as any)[key] = value.bind(obj);
		}
	}
	return obj;
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
