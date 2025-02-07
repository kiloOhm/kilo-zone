import { z } from 'zod';

export const DateString = z.string({}).refine((value) => {
	try {
		return new Date(value).toISOString() === value;
	} catch {
		return false;
	}
});
