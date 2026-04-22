<script setup lang="ts">
import { computed } from 'vue';
import VOldButton from '@/components/v-old-button.vue';
import VIcon from '@/components/v-icon/v-icon.vue';
import VListItemContent from '@/components/v-list-item-content.vue';
import VListItemIcon from '@/components/v-list-item-icon.vue';
import VListItem from '@/components/v-list-item.vue';
import VList from '@/components/v-list.vue';
import VTextOverflow from '@/components/v-text-overflow.vue';
import { useCollectionPermissions } from '@/composables/use-permissions';
import { useInsightsStore } from '@/stores/insights';
import { Dashboard } from '@/types/insights';

defineEmits(['create']);

const insightsStore = useInsightsStore();
const { createAllowed } = useCollectionPermissions('directus_dashboards');

const navItems = computed(() =>
	insightsStore.dashboards.map((dashboard: Dashboard) => ({
		icon: dashboard.icon,
		color: dashboard.color,
		name: dashboard.name,
		to: `/insights/${dashboard.id}`,
	})),
);
</script>

<template>
	<VList nav>
		<VOldButton v-if="navItems.length === 0 && createAllowed" type="normal" @click="$emit('create')">
			<template #default>{{ $t('create_dashboard') }}</template>
		</VOldButton>

		<VListItem v-for="navItem in navItems" v-else :key="navItem.to" :to="navItem.to">
			<VListItemIcon><VIcon :name="navItem.icon" :color="navItem.color" /></VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="navItem.name" />
			</VListItemContent>
		</VListItem>
	</VList>
</template>
