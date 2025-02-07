import { Context, Hono } from 'hono';
import { Ctx } from '../..';
import { cleanup, usePageService } from './pages.service';
import { getAuth } from '../../auth/authenticate.middleware';
import { BadRequestError, ForbiddenError } from '../../util/errors';
import { z } from 'zod';
import {
	emailPageDataInsertSchema,
	InsertPage,
	InsertPageData,
	PageData,
	pageInsertSchema,
	PageType,
	pastePageDataInsertSchema,
	redirectPageDataInsertSchema,
} from './pages.db';
import { rateLimit } from '../../util/ratelimit';
import { zValidator } from '@hono/zod-validator';
import { useObjectsService } from '../objects/objects.service';

// stricter rate limit to prevent enumeration
const { limit: availablePathLimit } = rateLimit({
	key: 'availablepath',
	authenticated: {
		maxRequestsPerWindow: 100,
		windowDuration: 24 * 60 * 60 * 1000, // 1 day
	},
});

export const pagesRouter = new Hono<Ctx>()

	// GET /?offset={offset}&limit={limit}
	.get(
		'/',
		zValidator(
			'query',
			z.object({
				offset: z.number({ coerce: true }).optional(),
				limit: z.number({ coerce: true }).optional(),
			})
		),
		async (c) => {
			const auth = getAuth(c);
			if (!auth) throw new ForbiddenError();
			const { getPages } = usePageService(c);
			const userId = auth.accessToken.sub;
			const { offset, limit } = c.req.valid('query');
			const pages = await getPages({
				filter: { ownerId: userId },
				pagination: { offset, limit },
			});
			return c.json(pages);
		}
	)

	// GET /:id
	.get(
		'/:id',
		zValidator(
			'param',
			z.object({
				id: z.string(),
			})
		),
		async (c) => {
			const { getPages } = usePageService(c);
			const { id } = c.req.valid('param');
			const {
				data: [page],
			} = await getPages({
				filter: { id },
				pagination: { limit: 1 },
			});
			return c.json(page);
		}
	)

	// GET /isPathAvailable?path={path1}&path={path2}
	.get(
		'/isPathAvailable',
		availablePathLimit,
		zValidator('query', z.object({ path: z.union([z.string(), z.array(z.string())]) })),
		async (c) => {
			const auth = getAuth(c);
			if (!auth) throw new ForbiddenError();
			const { checkPathAvailability } = usePageService(c);
			const paths = c.req.valid('query').path;
			const available = await checkPathAvailability(...(Array.isArray(paths) ? paths : [paths]));
			return c.json(available);
		}
	)

	// POST /
	.post(
		'/paste',
		zValidator(
			'json',
			z.object({
				...pageInsertSchema.shape,
				data: pastePageDataInsertSchema.omit({ direct: true }).optional(),
			})
		),
		async (c) => {
			const data = c.req.valid('json');
			return c.json(await createPageHandler('paste', c, data as InsertPage<'paste'>));
		}
	)
	.post(
		'/paste/upload',
		zValidator(
			'form',
			z.object({
				...pageInsertSchema.shape,
				data: pastePageDataInsertSchema.omit({ direct: true }).optional(),
				file: z.any(),
			})
		),
		async (c) => {
			const contentType = c.req.header('content-type') ?? c.req.header('Content-Type');
			if (!contentType?.toLowerCase().startsWith('multipart/form-data')) {
				throw new BadRequestError('Invalid content type. Must be multipart/form-data, got ' + contentType);
			}
			const body = await c.req.parseBody();
			if (!body) {
				throw new BadRequestError('Invalid body');
			}
			if (!body['file']) {
				// Allow upload from page
				throw new BadRequestError('Invalid body. Missing file');
			}
			const file = body['file'];
			if (typeof file === 'string') {
				throw new BadRequestError('Invalid body. File must be a file');
			}
			const { upload } = useObjectsService(c);
			const data = c.req.valid('form') as InsertPage<'paste'>;
			if (!data.data) data.data = {} as InsertPageData<'paste'>;
			data.data.direct = true;
			const newPage = await createPageHandler('paste', c, data as InsertPage<'paste'>);
			const { mimetype, size, fileName } = await upload(newPage.id, null, file);
			if (!newPage.data) newPage.data = {} as PageData<'paste'>;
			newPage.data.mimetype = mimetype;
			newPage.data.size = size;
			newPage.data.fileName = fileName;
			return c.json(newPage);
		}
	)
	.post(
		'/email',
		zValidator(
			'json',
			z.object({
				...pageInsertSchema.shape,
				data: emailPageDataInsertSchema,
			})
		),
		async (c) => {
			const data = c.req.valid('json');
			return c.json(await createPageHandler('email', c, data as InsertPage<'email'>));
		}
	)
	.post(
		'/redirect',
		zValidator(
			'json',
			z.object({
				...pageInsertSchema.shape,
				data: redirectPageDataInsertSchema,
			})
		),
		async (c) => {
			const data = c.req.valid('json');
			return c.json(await createPageHandler('redirect', c, data as InsertPage<'redirect'>));
		}
	)
	.post(
		'/chat',
		zValidator(
			'json',
			z.object({
				...pageInsertSchema.shape,
				data: z.undefined(),
			})
		),
		async (c) => {
			const data = c.req.valid('json');
			return c.json(await createPageHandler('chat', c, data as InsertPage<'chat'>));
		}
	)

	// DELETE /:id
	.delete(
		'/',
		zValidator(
			'query',
			z.object({
				id: z.string().optional(),
				path: z.string().optional(),
			})
		),
		async (c) => {
			const auth = getAuth(c);
			if (!auth) throw new ForbiddenError();
			const { deletePage } = usePageService(c);
			const ownerId = auth.accessToken.sub;
			const { id, path } = c.req.valid('query');
			await deletePage({
				id,
				path,
				ownerId,
			});
			return c.json({ success: true });
		}
	)
	.delete('/cleanup', async (c) => {
		return c.json(await cleanup(c.env));
	});

async function createPageHandler<T extends PageType>(type: T, c: Context<Ctx>, pageData: InsertPage<T>) {
	const auth = getAuth(c);
	if (!auth) throw new ForbiddenError();
	const { createPage } = usePageService(c);
	const userId = auth.accessToken.sub;
	const created = await createPage(type, pageData, userId);
	return created;
}
