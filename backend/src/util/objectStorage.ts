import { Context } from 'hono';
import { Ctx } from '..';
import { bindMethods } from './js';
import { NotFoundError } from './errors';

export class ObjectStorageError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class ObjectNotFoundError extends ObjectStorageError {
	constructor() {
		super('Object not found');
	}
}

export class ObjectNotUploadedError extends ObjectStorageError {
	constructor() {
		super('Object not uploaded');
	}
}

export class ObjectUploadFailedError extends ObjectStorageError {
	constructor() {
		super('Object upload failed');
	}
}

export function useObjectStorage(c: Context<Ctx>) {
	const bucket = c.env.KILO_ZONE_OBJECT_STORAGE;
	return bindMethods({
		async streamObject(key: string) {
			const r2Obj = await bucket.get(key);
			if (!r2Obj) throw new ObjectNotFoundError();
			if (!r2Obj.uploaded) throw new ObjectNotUploadedError();
			return {
				meta: r2Obj.httpMetadata,
				stream: r2Obj.body,
				size: r2Obj.size,
			};
		},
		async uploadObject(key: string, data: ReadableStream, meta?: R2HTTPMetadata) {
			const newObj = await bucket.put(key, data, {
				httpMetadata: meta,
			});
			if (!newObj) throw new ObjectUploadFailedError();
			return newObj?.size;
		},
		async removeObject(...keys: string[]) {
			await bucket.delete(keys);
		},
	});
}
