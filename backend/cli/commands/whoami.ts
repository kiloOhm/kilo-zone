import type { ActionDefinition } from '../util/args';
import { useAuth } from '../util/auth';

const { init, checkAuth, whoami } = useAuth();

export const whoamiCommand: ActionDefinition = {
	name: 'whoami',
	short: 'who',
	description: 'Show user info',
	handler: [init, checkAuth, whoami],
};
