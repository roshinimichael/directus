import { defineModule } from '@directus/extensions';
import SessionsView from './routes/sessions.vue';

export default defineModule({
	id: 'sessions',
	name: 'Sessions',
	icon: 'devices',
	routes: [
		{
			name: 'sessions',
			path: '',
			component: SessionsView,
		},
	],
});
