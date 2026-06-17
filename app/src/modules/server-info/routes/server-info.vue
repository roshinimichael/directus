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
		const [infoRes, healthRes] = await Promise.all([api.get('/server/info'), api.get('/server/health')]);

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
	<PrivateView title="Server Info" icon="dns">
		<template #headline>
			<VBreadcrumb :items="[{ name: 'Server Info', to: '/server-info' }]" />
		</template>

		<template #actions>
			<VButton v-tooltip.bottom="'Refresh'" rounded icon :loading="loading" @click="fetchServerInfo">
				<VIcon name="refresh" />
			</VButton>
		</template>

		<div class="server-info-page">
			<VNotice v-if="error" type="danger">{{ error }}</VNotice>

			<div v-if="loading && !serverInfo" class="loading">
				<VProgressCircular indeterminate />
			</div>

			<template v-if="serverInfo">
				<div class="status-bar">
					<VChip :class="healthStatus === 'ok' ? 'healthy' : 'degraded'" small>
						<VIcon :name="healthStatus === 'ok' ? 'check_circle' : 'warning'" small />
						{{ healthStatus === 'ok' ? 'Healthy' : (healthStatus ?? 'Unknown') }}
					</VChip>
				</div>

				<VCard>
					<VCardTitle>Directus</VCardTitle>
					<VCardText>
						<dl class="info-grid">
							<div class="info-row">
								<dt>Version</dt>
								<dd>{{ serverInfo.version ?? '—' }}</dd>
							</div>
						</dl>
					</VCardText>
				</VCard>
			</template>
		</div>
	</PrivateView>
</template>

<style lang="scss" scoped>
.server-info-page {
	padding: var(--content-padding);
	max-inline-size: 560px;
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
	border-block-end: 1px solid var(--theme--border-color-subdued);

	&:last-child {
		border-block-end: none;
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
