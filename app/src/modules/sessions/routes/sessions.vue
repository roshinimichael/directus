<script setup lang="ts">
import { useApi } from '@directus/composables';
import { onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/user';

interface Session {
	id: string;
	ip: string | null;
	user_agent: string | null;
	origin: string | null;
	expires: string;
}

const api = useApi();
const userStore = useUserStore();

const sessions = ref<Session[]>([]);
const loading = ref(false);
const revoking = ref<string | null>(null);
const error = ref<string | null>(null);
const activeSessionCount = ref<number>((userStore.currentUser as any)?.active_session_count ?? 0);

async function fetchSessions() {
	loading.value = true;
	error.value = null;

	try {
		const res = await api.get('/users/me/sessions');
		sessions.value = res.data.data;
		activeSessionCount.value = sessions.value.length;
	} catch (err: any) {
		error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to load sessions';
	} finally {
		loading.value = false;
	}
}

async function revokeSession(id: string) {
	revoking.value = id;
	error.value = null;

	try {
		await api.delete(`/users/me/sessions/${id}`);
		sessions.value = sessions.value.filter((s) => s.id !== id);
		activeSessionCount.value = sessions.value.length;
	} catch (err: any) {
		error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to revoke session';
	} finally {
		revoking.value = null;
	}
}

onMounted(fetchSessions);
</script>

<template>
	<PrivateView
		:title="activeSessionCount > 0 ? `Active Sessions (${activeSessionCount})` : 'Active Sessions'"
		icon="devices"
	>
		<template #headline>
			<VBreadcrumb :items="[{ name: 'Active Sessions', to: '/sessions' }]" />
		</template>

		<template #actions>
			<VButton v-tooltip.bottom="'Refresh'" rounded icon :loading="loading" @click="fetchSessions">
				<VIcon name="refresh" />
			</VButton>
		</template>

		<div class="sessions-page">
			<VNotice v-if="error" type="danger">{{ error }}</VNotice>

			<div v-if="loading && sessions.length === 0" class="loading">
				<VProgressCircular indeterminate />
			</div>

			<div v-else-if="sessions.length === 0" class="empty">
				<VIcon name="devices" x-large />
				<p>No active sessions</p>
			</div>

			<VList v-else>
				<VListItem v-for="session in sessions" :key="session.id">
					<VListItemIcon>
						<VIcon name="computer" />
					</VListItemIcon>

					<VListItemContent>
						<VTextOverflow :text="session.user_agent ?? 'Unknown device'" />
						<div class="session-meta">
							<span v-if="session.ip">{{ session.ip }}</span>
							<span v-if="session.origin">· {{ session.origin }}</span>
							<span>· Expires {{ new Date(session.expires).toLocaleString() }}</span>
						</div>
					</VListItemContent>

					<template #append>
						<VButton
							v-tooltip.bottom="'Revoke session'"
							rounded
							icon
							small
							secondary
							:loading="revoking === session.id"
							@click="revokeSession(session.id)"
						>
							<VIcon name="logout" small />
						</VButton>
					</template>
				</VListItem>
			</VList>
		</div>
	</PrivateView>
</template>

<style lang="scss" scoped>
.sessions-page {
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

.session-meta {
	font-size: 12px;
	color: var(--theme--foreground-subdued);
	margin-block-start: 2px;
}
</style>
