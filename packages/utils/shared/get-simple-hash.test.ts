import { describe, expect, it } from 'vitest';
import { getSimpleHash } from './get-simple-hash.js';

describe('getSimpleHash', () => {
	it('returns "364492" for string "test"', () => {
		expect(getSimpleHash('test')).toBe('364492');
	});

	it('returns "28cb67ba" for stringified object "{ key: \'value\' }"', () => {
		expect(getSimpleHash(JSON.stringify({ key: 'value' }))).toBe('28cb67ba');
	});

	it('truncates output to the given length', () => {
		expect(getSimpleHash('test', 4)).toBe('3644');
	});

	it('returns full hash when length exceeds hash length', () => {
		expect(getSimpleHash('test', 100)).toBe('364492');
	});

	it('returns empty string when length is 0', () => {
		expect(getSimpleHash('test', 0)).toBe('');
	});
});
