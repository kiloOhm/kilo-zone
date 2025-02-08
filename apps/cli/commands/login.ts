import type { ActionDefinition } from '../util/args';
import { useAuth } from '../util/auth';

const { deviceFlow } = useAuth();

export const loginCommand: ActionDefinition = {
	name: 'login',
	short: 'li',
	description: 'Authenticate',
	handler: deviceFlow,
};
