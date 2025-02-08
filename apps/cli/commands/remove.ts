import { z } from 'zod';
import { apiClient } from '..';
import type { ActionDefinition } from '../util/args';
import { useAuth } from '../util/auth';

const { init, checkAuth, state: authState } = useAuth();

export const removeCommand: ActionDefinition = {
	name: 'remove',
	short: 'rm',
	description: 'Remove a page',
	args: [
		{
			name: 'path',
			short: 'p',
			valueDescription: 'path of page',
			valueType: 'string',
			required: false,
		},
		{
			name: 'id',
			short: 'id',
			valueDescription: 'id of page',
			valueType: 'string',
			required: false,
		},
	],
	handler: [
		init,
		checkAuth,
		async ({ args }) => {
			const path = z.string().optional().parse(args.get('path'));
			const id = z.string().optional().parse(args.get('id'));
			if (!path && !id) {
				throw new Error('Either provide a path or an id');
			}
			const res = await apiClient.pages.$delete(
				{
					query: {
						id,
						path,
					},
				},
				{ headers: { Authorization: `Bearer ${authState.accessToken}` } }
			);
			const result = await res.json();
			console.log(result);
		},
	],
};
