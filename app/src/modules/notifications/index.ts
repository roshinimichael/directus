import { defineModule } from '@directus/extensions';
import NotificationsCollection from './routes/collection.vue';

export default defineModule({
	id: 'notifications',
	name: 'Notifications',
	icon: 'notifications',
	routes: [
		{
			name: 'notifications-collection',
			path: '',
			component: NotificationsCollection,
		},
	],
});
