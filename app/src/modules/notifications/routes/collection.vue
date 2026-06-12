<script setup lang="ts">
import { useApi } from '@directus/composables';
import { onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/user';

interface Notification {
	id: number;
	subject: string;
	message: string | null;
	status: 'inbox' | 'read' | 'archived';
	timestamp: string;
	sender: string | null;
}

const api = useApi();
const userStore = useUserStore();

const notifications = ref<Notification[]>([]);
const loading = ref(false);
const markingAllRead = ref(false);
const error = ref<string | null>(null);
const unreadBadge = ref<number>((userStore.currentUser as any)?.unread_notifications ?? 0);

async function fetchNotifications() {
	loading.value = true;
	error.value = null;

	try {
		const res = await api.get('/notifications', {
			params: { sort: '-timestamp', limit: 100 },
		});

		notifications.value = res.data.data;
		unreadBadge.value = notifications.value.filter((n) => n.status === 'inbox').length;
	} catch (err: any) {
		error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to load notifications';
	} finally {
		loading.value = false;
	}
}

async function markAllRead() {
	markingAllRead.value = true;

	try {
		await api.patch('/notifications/read-all');
		await fetchNotifications();
	} catch (err: any) {
		error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to mark notifications as read';
	} finally {
		markingAllRead.value = false;
	}
}

async function markOneRead(id: number) {
	try {
		await api.patch(`/notifications/${id}`, { status: 'read' });
		const n = notifications.value.find((n) => n.id === id);
		if (n) n.status = 'read';
	} catch {
		// silently ignore individual mark-read failures
	}
}

const unreadCount = () => notifications.value.filter((n) => n.status === 'inbox').length;

onMounted(fetchNotifications);
</script>

<template>
	<PrivateView :title="unreadBadge > 0 ? `Notifications (${unreadBadge})` : 'Notifications'" icon="notifications">
		<template #headline>
			<VBreadcrumb :items="[{ name: 'Notifications', to: '/notifications' }]" />
		</template>

		<template #actions>
			<VButton v-tooltip.bottom="'Refresh'" rounded icon :loading="loading" @click="fetchNotifications">
				<VIcon name="refresh" />
			</VButton>

			<VButton
				v-tooltip.bottom="'Mark all as read'"
				rounded
				icon
				:disabled="unreadCount() === 0 || markingAllRead"
				:loading="markingAllRead"
				@click="markAllRead"
			>
				<VIcon name="done_all" />
			</VButton>
		</template>

		<div class="notifications-page">
			<VNotice v-if="error" type="danger">{{ error }}</VNotice>

			<div v-if="loading && notifications.length === 0" class="loading">
				<VProgressCircular indeterminate />
			</div>

			<div v-else-if="notifications.length === 0" class="empty">
				<VIcon name="notifications_none" x-large />
				<p>No notifications</p>
			</div>

			<VList v-else>
				<VListItem
					v-for="n in notifications"
					:key="n.id"
					:class="{ unread: n.status === 'inbox' }"
					clickable
					@click="markOneRead(n.id)"
				>
					<VListItemIcon>
						<VIcon
							:name="n.status === 'inbox' ? 'circle_notifications' : 'notifications'"
							:class="n.status === 'inbox' ? 'unread-icon' : 'read-icon'"
						/>
					</VListItemIcon>

					<VListItemContent>
						<VTextOverflow :text="n.subject" />
						<VTextOverflow v-if="n.message" class="message" :text="n.message" />
					</VListItemContent>

					<VListItemHint>
						{{ new Date(n.timestamp).toLocaleString() }}
					</VListItemHint>
				</VListItem>
			</VList>
		</div>
	</PrivateView>
</template>

<style lang="scss" scoped>
.notifications-page {
	padding: var(--content-padding);
	max-inline-size: 720px;
}

.loading,
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 64px 0;
	color: var(--theme--foreground-subdued);
}

.v-list-item.unread {
	background-color: var(--theme--primary-background);
}

.unread-icon {
	color: var(--theme--primary);
}

.read-icon {
	color: var(--theme--foreground-subdued);
}

.message {
	color: var(--theme--foreground-subdued);
	font-size: 13px;
	margin-block-start: 2px;
}
</style>
