import { z } from 'zod';
import { apiClient } from '..';
import type { ActionDefinition } from '../util/args';
import { useAuth } from '../util/auth';

const { init, checkAuth, state: authState } = useAuth();

export const listCommand: ActionDefinition = {
	name: 'list',
	short: 'ls',
	description: 'List pages',
	handler: [
		init,
		checkAuth,
		async ({ args }) => {
			const res = await apiClient.pages.$get(
				{
					query: {
						limit: z.string({ coerce: true }).parse(args.get('limit')),
						offset: z.string({ coerce: true }).parse(args.get('offset')),
					},
				},
				{
					headers: { Authorization: `Bearer ${authState.accessToken}` },
				}
			);
			const pages = await res.json();
			console.dir(pages, { depth: 9 });
		},
	],
	args: [
		{
			name: 'limit',
			short: 'l',
			valueDescription: 'Limit',
			valueType: 'number',
			required: false,
			default: 10,
		},
		{
			name: 'offset',
			short: 'o',
			valueDescription: 'Offset',
			valueType: 'number',
			required: false,
			default: 0,
		},
	],
};
