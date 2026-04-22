<script setup lang="ts">
/**
 * @deprecated Use <v-button> instead. This component will be removed in v12.
 * Migration: type → kind, <template #default> → direct slot content
 */
import { computed } from 'vue';

interface Props {
	type?: 'normal' | 'info' | 'success' | 'warning' | 'danger';
	disabled?: boolean;
	loading?: boolean;
	fullWidth?: boolean;
	rounded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	type: 'normal',
	disabled: false,
	loading: false,
	fullWidth: false,
	rounded: false,
});

const emit = defineEmits(['click']);

const variantClass = computed(() => `v-old-button--${props.type}`);
</script>

<template>
	<button
		:class="['v-old-button', variantClass, { 'full-width': fullWidth, rounded }]"
		:disabled="disabled || loading"
		@click="emit('click', $event)"
	>
		<span v-if="loading" class="spinner" />
		<slot name="default" />
	</button>
</template>

<style scoped>
.v-old-button {
	padding: 8px 16px;
	border-radius: var(--theme--border-radius);
	border: none;
	cursor: pointer;
	font-family: var(--theme--fonts--sans--font-family);
	font-size: 14px;
	font-weight: 600;
	transition: all var(--fast) var(--transition);
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.v-old-button--normal {
	background: var(--theme--primary);
	color: var(--white);
}

.v-old-button--info {
	background: var(--blue);
	color: var(--white);
}

.v-old-button--success {
	background: var(--theme--success);
	color: var(--white);
}

.v-old-button--warning {
	background: var(--theme--warning);
	color: var(--white);
}

.v-old-button--danger {
	background: var(--theme--danger);
	color: var(--white);
}

.v-old-button:hover:not(:disabled) {
	opacity: 0.9;
}

.v-old-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.v-old-button.full-width {
	width: 100%;
	justify-content: center;
}

.v-old-button.rounded {
	border-radius: 50px;
}

.spinner {
	display: inline-block;
	width: 14px;
	height: 14px;
	border: 2px solid currentColor;
	border-top-color: transparent;
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
