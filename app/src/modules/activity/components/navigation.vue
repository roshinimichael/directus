<script setup lang="ts">
import { useApi } from '@directus/composables';
import { Filter } from '@directus/types';
import { computed, onMounted, ref } from 'vue';
import VBadge from '@/components/v-badge.vue';
import VDivider from '@/components/v-divider.vue';
import VIcon from '@/components/v-icon/v-icon.vue';
import VListItemContent from '@/components/v-list-item-content.vue';
import VListItemIcon from '@/components/v-list-item-icon.vue';
import VListItem from '@/components/v-list-item.vue';
import VList from '@/components/v-list.vue';
import VTextOverflow from '@/components/v-text-overflow.vue';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
	filter?: Filter;
}>();

const emit = defineEmits(['update:filter']);

const api = useApi();
const userStore = useUserStore();
const currentUserID = computed(() => userStore.currentUser?.id);

const filterField = computed(() => Object.keys(props.filter ?? {})[0] ?? null);
const filterValue = computed(() => Object.values(props.filter ?? {})[0]?._eq ?? null);

const counts = ref<Record<string, number>>({
	create: 0,
	update: 0,
	delete: 0,
	login: 0,
	logout: 0,
});

async function fetchCounts() {
	const actions = ['create', 'update', 'delete', 'login', 'logout'];

	const results = await Promise.all(
		actions.map((action) =>
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
}

function setNavFilter(key: string, value: any) {
	emit('update:filter', {
		[key]: {
			_eq: value,
		},
	});
}

function clearNavFilter() {
	emit('update:filter', null);
}

onMounted(fetchCounts);
</script>

<template>
	<VList nav>
		<VListItem clickable :active="!filterField" @click="clearNavFilter">
			<VListItemIcon>
				<VIcon name="access_time" />
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('all_activity')" />
			</VListItemContent>
		</VListItem>

		<VListItem
			clickable
			:active="filterField === 'user' && filterValue === currentUserID"
			@click="setNavFilter('user', currentUserID)"
		>
			<VListItemIcon>
				<VIcon name="face" />
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('my_activity')" />
			</VListItemContent>
		</VListItem>

		<VDivider />

		<VListItem
			clickable
			:active="filterField === 'action' && filterValue === 'create'"
			@click="setNavFilter('action', 'create')"
		>
			<VListItemIcon>
				<VBadge :value="counts.create" :max="999">
					<VIcon name="add" />
				</VBadge>
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('create')" />
			</VListItemContent>
		</VListItem>

		<VListItem
			clickable
			:active="filterField === 'action' && filterValue === 'update'"
			@click="setNavFilter('action', 'update')"
		>
			<VListItemIcon>
				<VBadge :value="counts.update" :max="999">
					<VIcon name="check" />
				</VBadge>
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('update')" />
			</VListItemContent>
		</VListItem>

		<VListItem
			clickable
			:active="filterField === 'action' && filterValue === 'delete'"
			@click="setNavFilter('action', 'delete')"
		>
			<VListItemIcon>
				<VBadge :value="counts.delete" :max="999">
					<VIcon name="clear" />
				</VBadge>
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('delete_label')" />
			</VListItemContent>
		</VListItem>

		<VListItem
			clickable
			:active="filterField === 'action' && filterValue === 'login'"
			@click="setNavFilter('action', 'login')"
		>
			<VListItemIcon>
				<VBadge :value="counts.login" :max="999">
					<VIcon name="login" />
				</VBadge>
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('login')" />
			</VListItemContent>
		</VListItem>

		<VListItem
			clickable
			:active="filterField === 'action' && filterValue === 'logout'"
			@click="setNavFilter('action', 'logout')"
		>
			<VListItemIcon>
				<VBadge :value="counts.logout" :max="999">
					<VIcon name="logout" />
				</VBadge>
			</VListItemIcon>
			<VListItemContent>
				<VTextOverflow :text="$t('logout')" />
			</VListItemContent>
		</VListItem>
	</VList>
</template>
