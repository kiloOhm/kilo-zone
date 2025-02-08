import type { ActionDefinition } from '../util/args';
import { useAuth } from '../util/auth';

const { init, checkAuth, logout } = useAuth();

export const logoutCommand: ActionDefinition = {
	name: 'logout',
	short: 'lo',
	description: 'Logout',
	handler: [init, checkAuth, logout],
};
