import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import VOldButton from './v-old-button.vue';

describe('VOldButton (deprecated)', () => {
	it('renders with default props', () => {
		const wrapper = mount(VOldButton, {
			slots: { default: 'Click me' },
		});

		expect(wrapper.text()).toBe('Click me');
		expect(wrapper.classes()).toContain('v-old-button--normal');
	});

	it('applies correct variant class for type prop', () => {
		const wrapper = mount(VOldButton, {
			props: { type: 'danger' },
			slots: { default: 'Delete' },
		});

		expect(wrapper.classes()).toContain('v-old-button--danger');
	});

	it('disables button when disabled prop is true', () => {
		const wrapper = mount(VOldButton, {
			props: { disabled: true },
			slots: { default: 'Disabled' },
		});

		expect(wrapper.attributes('disabled')).toBeDefined();
	});

	it('shows spinner when loading', () => {
		const wrapper = mount(VOldButton, {
			props: { loading: true },
			slots: { default: 'Loading' },
		});

		expect(wrapper.find('.spinner').exists()).toBe(true);
		expect(wrapper.attributes('disabled')).toBeDefined();
	});

	it('emits click event', async () => {
		const wrapper = mount(VOldButton, {
			slots: { default: 'Click' },
		});

		await wrapper.trigger('click');
		expect(wrapper.emitted('click')).toHaveLength(1);
	});
});
