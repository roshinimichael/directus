import { defineModule } from '@directus/extensions-sdk';
import WebhooksList from './webhooks-list.vue';

export default defineModule({
	id: 'webhooks',
	name: 'Webhooks',
	icon: 'webhook',
	routes: [
		{ path: '', component: WebhooksList },
	],
	hidden: false,
});
