import { Context } from 'hono';
import { Ctx } from '..';
import { StatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context<Ctx>) {
	console.log('errorHandler', err);
	if (err instanceof HttpError) {
		c.status(err.status);
		return c.json({ error: err.message });
	} else if (err instanceof ZodError) {
		c.status(400);
		const formatted = err.format();
		console.error(formatted, err.stack);
		return c.json(formatted);
	} else {
		c.status(500);
		console.error(err, err.stack);
		return c.json({ error: 'Internal Server Error' });
	}
}

export class HttpError extends Error {
	constructor(public status: StatusCode, message: string) {
		super(message);
	}
}

export class BadRequestError extends HttpError {
	constructor(message?: string) {
		super(400, message ?? 'Bad Request');
	}
}

export class NotFoundError extends HttpError {
	constructor(message?: string) {
		super(404, message ?? 'Not Found');
	}
}

export class ForbiddenError extends HttpError {
	constructor(message?: string) {
		super(403, message ?? 'Forbidden');
	}
}

export class TooManyRequestsError extends HttpError {
	constructor(message?: string) {
		super(429, message ?? 'Too Many Requests');
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message?: string) {
		super(401, message ?? 'Unauthorized');
	}
}
