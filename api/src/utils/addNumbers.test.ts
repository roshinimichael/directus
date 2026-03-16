import { describe, expect, test } from 'vitest';
import { addNumbers } from './addNumbers';

describe('addNumbers', () => {
	test('adds two positive numbers', () => {
		expect(addNumbers(2, 3)).toBe(5);
	});

	test('adds negative numbers', () => {
		expect(addNumbers(-1, -2)).toBe(-3);
	});

	test('adds zero', () => {
		expect(addNumbers(0, 5)).toBe(5);
	});
});
