import { Hono } from 'hono';
import { Ctx } from '../..';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { useObjectsService } from './objects.service';
import { BadRequestError } from '../../util/errors';

export const objectsRouter = new Hono<Ctx>()

	.get(
		'/:pageId',
		zValidator(
			'param',
			z.object({
				pageId: z.string(),
			})
		),
		zValidator(
			'query',
			z.object({
				signature: z.string(),
			})
		),
		async (c) => {
			const { pageId } = c.req.valid('param');
			const { signature } = c.req.valid('query');
			const { download } = useObjectsService(c);
			const { meta, stream, size } = await download(pageId, signature);
			const res = new Response(stream);
			res.headers.set('Content-Length', size.toString());
			res.headers.set('Content-Type', 'application/octet-stream');
			if (meta) {
				if (meta.contentType) res.headers.set('Content-Type', meta.contentType);
				if (meta.contentDisposition) res.headers.set('Content-Disposition', meta.contentDisposition);
			}
			return res;
		}
	)

	.post(
		'/:pageId',
		zValidator(
			'param',
			z.object({
				pageId: z.string(),
			})
		),
		zValidator(
			'query',
			z.object({
				signature: z.string(),
			})
		),
		async (c) => {
			const { pageId } = c.req.valid('param');
			const { signature } = c.req.valid('query');
			const { upload } = useObjectsService(c);
			// check content type
			const contentType = c.req.header('content-type') ?? c.req.header('Content-Type');
			if (!contentType?.toLowerCase().startsWith('multipart/form-data')) {
				throw new BadRequestError('Invalid content type. Must be multipart/form-data, got ' + contentType);
			}
			const body = await c.req.parseBody();
			if (!body) {
				throw new BadRequestError('Invalid body');
			}
			if (!body['file']) {
				throw new BadRequestError('Invalid body. Missing file');
			}
			const file = body['file'];
			if (typeof file === 'string') {
				throw new BadRequestError('Invalid body. File must be a file');
			}
			const uploaded = await upload(pageId, signature, file);
			return c.json({ uploaded });
		}
	);

// // DEBUG - only use in dev
// .get('links/:key', async (c) => {
// 	const key = c.req.param('key');
// 	const { getSignedLink } = useObjectsService(c);
// 	const dl = await getSignedLink(key, 30 * 60 * 1000, 'download');
// 	const ul = await getSignedLink(key, 30 * 60 * 1000, 'upload');
// 	return c.json({ dl, ul });
// });
