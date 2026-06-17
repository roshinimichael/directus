import { useApi } from '@directus/composables';
import { onMounted, onUnmounted, ref } from 'vue';

export type ActivityCounts = Record<string, number>;

const ACTIONS = ['create', 'update', 'delete', 'login', 'logout'] as const;

export function useActivityCounts(refreshInterval = 30_000) {
	const api = useApi();

	const counts = ref<ActivityCounts>({
		create: 0,
		update: 0,
		delete: 0,
		login: 0,
		logout: 0,
	});

	const loading = ref(false);
	const error = ref<Error | null>(null);

	let intervalId: ReturnType<typeof setInterval> | undefined;

	async function fetchCounts() {
		loading.value = true;
		error.value = null;

		try {
			const results = await Promise.all(
				ACTIONS.map((action) =>
					api
						.get('/activity', {
							params: { aggregate: { count: ['*'] }, filter: { action: { _eq: action } }, limit: -1 },
						})
						.then((res) => ({ action, count: Number(res.data.data?.[0]?.count ?? 0) }))
						.catch(() => ({ action, count: 0 })),
				),
			);

			for (const { action, count } of results) {
				counts.value[action] = count;
			}
		} catch (e) {
			error.value = e as Error;
		} finally {
			loading.value = false;
		}
	}

	onMounted(() => {
		fetchCounts();
		intervalId = setInterval(fetchCounts, refreshInterval);
	});

	onUnmounted(() => {
		clearInterval(intervalId);
	});

	return { counts, loading, error, fetchCounts };
}
