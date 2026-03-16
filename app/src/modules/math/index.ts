import { defineModule } from '@directus/extensions';
import ServerInfo from './routes/calculator.vue';

export default defineModule({
	id: 'server-info',
	name: 'Server Info',
	icon: 'dns',
	routes: [
		{
			name: 'server-info-index',
			path: '',
			component: ServerInfo,
		},
	],
});
