import { ref, Ref } from 'vue';
import api from '@/api';

export interface Webhook {
	id: string;
	url: string;
	method: string;
	collections: string[];
}

export function useWebhooks() {
	const webhooks: Ref<Webhook[]> = ref([]);
	const loading: Ref<boolean> = ref(false);
	const error: Ref<string | null> = ref(null);

	async function fetchWebhooks() {
		loading.value = true;
		error.value = null;

		try {
			const response = await api.get('/webhooks');
			webhooks.value = response.data.data;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch webhooks';
			console.error('Error fetching webhooks:', err);
		} finally {
			loading.value = false;
		}
	}

	async function refresh() {
		await fetchWebhooks();
	}

	// Fetch on mount
	fetchWebhooks();

	return {
		webhooks,
		loading,
		error,
		refresh,
		fetchWebhooks,
	};
}
