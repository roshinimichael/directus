<script setup lang="ts">
import { useApi } from '@directus/composables';
import { onMounted, ref } from 'vue';

const api = useApi();

const serverInfo = ref<Record<string, any> | null>(null);
const healthStatus = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchServerInfo() {
	error.value = null;
	loading.value = true;

	try {
		const [infoRes, healthRes] = await Promise.all([
			api.get('/server/info'),
			api.get('/server/health'),
		]);

		serverInfo.value = infoRes.data.data;
		healthStatus.value = healthRes.data.status;
	} catch (err: any) {
		error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to fetch server info';
	} finally {
		loading.value = false;
	}
}

onMounted(fetchServerInfo);
</script>

<template>
	<private-view title="Server Info" icon="dns">
		<template #headline>
			<v-breadcrumb :items="[{ name: 'Server Info', to: '/server-info' }]" />
		</template>

		<template #actions>
			<v-button v-tooltip.bottom="'Refresh'" rounded icon :loading="loading" @click="fetchServerInfo">
				<v-icon name="refresh" />
			</v-button>
		</template>

		<div class="server-info-page">
			<v-notice v-if="error" type="danger">{{ error }}</v-notice>

			<div v-if="loading && !serverInfo" class="loading">
				<v-progress-circular indeterminate />
			</div>

			<template v-if="serverInfo">
				<div class="status-bar">
					<v-chip :class="healthStatus === 'ok' ? 'healthy' : 'degraded'" small>
						<v-icon :name="healthStatus === 'ok' ? 'check_circle' : 'warning'" small />
						{{ healthStatus === 'ok' ? 'Healthy' : healthStatus ?? 'Unknown' }}
					</v-chip>
				</div>

				<v-card>
					<v-card-title>Directus</v-card-title>
					<v-card-text>
						<dl class="info-grid">
							<div class="info-row">
								<dt>Version</dt>
								<dd>{{ serverInfo.directus?.version ?? '—' }}</dd>
							</div>
							<div class="info-row">
								<dt>Node.js</dt>
								<dd>{{ serverInfo.node?.version ?? '—' }}</dd>
							</div>
							<div class="info-row">
								<dt>OS</dt>
								<dd>{{ serverInfo.os?.type ?? '—' }} {{ serverInfo.os?.version ?? '' }}</dd>
							</div>
						</dl>
					</v-card-text>
				</v-card>
			</template>
		</div>
	</private-view>
</template>

<style lang="scss" scoped>
.server-info-page {
	padding: var(--content-padding);
	max-width: 560px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.loading {
	display: flex;
	justify-content: center;
	padding: 48px 0;
}

.status-bar {
	display: flex;
	align-items: center;
	gap: 8px;
}

.v-chip.healthy {
	--v-chip-background-color: var(--theme--success);
	--v-chip-color: var(--white);
}

.v-chip.degraded {
	--v-chip-background-color: var(--theme--warning);
	--v-chip-color: var(--white);
}

.info-grid {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 0;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid var(--theme--border-color-subdued);

	&:last-child {
		border-bottom: none;
	}

	dt {
		color: var(--theme--foreground-subdued);
		font-weight: 500;
	}

	dd {
		font-weight: 600;
		color: var(--theme--foreground);
		margin: 0;
	}
}
</style>
