<template>
	<private-view title="Webhooks">
		<template #headline>Settings</template>
		<template #title-outer:prepend>
			<v-button class="header-icon" rounded icon secondary>
				<v-icon name="webhook" />
			</v-button>
		</template>

		<template #actions>
			<v-button v-tooltip.bottom="'Refresh'" rounded icon @click="refresh">
				<v-icon name="refresh" />
			</v-button>
		</template>

		<div class="webhooks-list">
			<v-info v-if="loading" type="warning" icon="hourglass_empty">
				Loading webhooks...
			</v-info>

			<v-info v-else-if="error" type="danger" icon="error">
				{{ error }}
			</v-info>

			<v-table
				v-else
				:headers="tableHeaders"
				:items="webhooks"
				:loading="loading"
				show-resize
				fixed-header
			>
				<template #[`item.url`]="{ item }">
					<span class="monospace">{{ item.url }}</span>
				</template>

				<template #[`item.method`]="{ item }">
					<v-chip small :style="{ backgroundColor: getMethodColor(item.method) }">
						{{ item.method }}
					</v-chip>
				</template>

				<template #[`item.collections`]="{ item }">
					<div class="collections-list">
						<v-chip v-for="collection in item.collections" :key="collection" small>
							{{ collection }}
						</v-chip>
					</div>
				</template>
			</v-table>
		</div>
	</private-view>
</template>

<script setup lang="ts">
import { useWebhooks } from '@/composables/use-webhooks';

const { webhooks, loading, error, refresh } = useWebhooks();

const tableHeaders = [
	{ text: 'URL', value: 'url', width: 300 },
	{ text: 'Method', value: 'method', width: 100 },
	{ text: 'Collections', value: 'collections', width: 300 },
];

function getMethodColor(method: string): string {
	const colors: Record<string, string> = {
		GET: '#4CAF50',
		POST: '#2196F3',
		PUT: '#FF9800',
		PATCH: '#9C27B0',
		DELETE: '#F44336',
	};
	return colors[method] || '#757575';
}
</script>

<style scoped>
.webhooks-list {
	padding: var(--content-padding);
}

.monospace {
	font-family: 'Courier New', monospace;
}

.collections-list {
	display: flex;
	gap: 8px;
